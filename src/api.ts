import { env } from 'node:process'
import axios from 'axios'
import { randUserAgent } from './utils'
import { DEFAULT_COOKIE_KEY, DEFAULT_DOMAIN } from './constant'

import type {
  ArticleResponse,
  KnowledgeBase,
  GetHeaderParams,
  GetMdDataParams,
  IReqHeader,
  TGetKnowledgeBaseInfo,
  TGetMdData
} from './types'
import type { AxiosRequestConfig } from 'axios'

function getHeaders(cookie: GetHeaderParams[], header: GetHeaderParams[]): IReqHeader {
  const headers: IReqHeader = {
    'user-agent': randUserAgent({
      browser: 'chrome',
      device: 'desktop'
    })
  }

  // set the header from header 
  header.forEach(h => {
    if (h.key !== undefined && h.token !== undefined) {
      headers[h.key] = h.token;
    }
  })

  // 收集所有cookie
  const cookies: string[] = []

  // 遍历所有参数对象，收集cookie
  for (const params of cookie) {
    const { key = DEFAULT_COOKIE_KEY, token } = params
    if (token) {
      cookies.push(`${key}=${token}`)
    }
  }

  // 如果有cookie，则设置到headers中
  if (cookies.length > 0) {
    headers.cookie = cookies.join('; ') + ';'
  }
  return headers
}

export function genCommonOptions(cookie: GetHeaderParams[], header: GetHeaderParams[]): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    headers: getHeaders(cookie, header),
    beforeRedirect: (options) => {
      // 语雀免费非企业空间会重定向如: www.yuque.com -> gxr404.yuque.com
      // 此时axios自动重定向并不会带上cookie
      options.headers = {
        ...(options?.headers || {}),
        ...getHeaders(cookie, header)
      }
    }
  }
  if (env.NODE_ENV === 'test') {
    config.proxy = false
  }
  return config
}


/** 获取知识库数据信息 */
export const getKnowledgeBaseInfo: TGetKnowledgeBaseInfo = (url, headerParams) => {
  const knowledgeBaseReg = /decodeURIComponent\("(.+)"\)\);/m
  return axios.get<string>(url, genCommonOptions([headerParams], []))
    .then(({ data = '', status }) => {
      if (status === 200) return data
      return ''
    })
    .then(html => {
      const data = knowledgeBaseReg.exec(html) ?? ''
      if (!data[1]) return {}
      const jsonData: KnowledgeBase.Response = JSON.parse(decodeURIComponent(data[1]))
      if (!jsonData.book) return {}
      const info = {
        bookId: jsonData.book.id,
        bookSlug: jsonData.book.slug,
        tocList: jsonData.book.toc || [],
        bookName: jsonData.book.name || '',
        bookDesc: jsonData.book.description || '',
        host: jsonData.space?.host || DEFAULT_DOMAIN,
        imageServiceDomains: jsonData.imageServiceDomains || []
      }
      return info
    }).catch((e) => {
      // console.log(e.message)
      const errMsg = e?.message ?? ''
      if (!errMsg) throw new Error('unknown error')
      const netErrInfoList = [
        'getaddrinfo ENOTFOUND',
        'read ECONNRESET',
        'Client network socket disconnected before secure TLS connection was established'
      ]
      const isNetError = netErrInfoList.some(netErrMsg => errMsg.startsWith(netErrMsg))
      if (isNetError) {
        throw new Error('请检查网络(是否正常联网/是否开启了代理软件)')
      }
      throw new Error(errMsg)
    })
}


export const getDocsMdData: TGetMdData = (params, isMd = true) => {
  const { articleUrl, bookId, token, key, host = DEFAULT_DOMAIN } = params
  let apiUrl = `${host}/api/docs/${articleUrl}`
  const queryParams: any = {
    'book_id': String(bookId),
    'merge_dynamic_data': String(false)
    // plain=false
    // linebreak=true
    // anchor=true
  }
  if (isMd) queryParams.mode = 'markdown'
  const query = new URLSearchParams(queryParams).toString()
  apiUrl = `${apiUrl}?${query}`
  return axios.get<ArticleResponse.RootObject>(apiUrl, genCommonOptions([{ token, key }], []))
    .then(({ data, status }) => {
      const res = {
        apiUrl,
        httpStatus: status,
        response: data
      }
      return res
    })
}

/** 请求导出文档 */
export const requestDocExport = (
  params: GetMdDataParams,
  exportType: 'word' | 'excel' | 'lakeboard' = 'excel') => {

  const { id, token, key, itemUrl } = params
  const apiUrl = `https://taichu-mp.yuque.com/api/docs/${id}/export`

  const requestData = {
    type: exportType,
    force: 0
  }

  const cookies: GetHeaderParams[] = [
    { token, key },
    {
      key: "yuque_ctoken",
      token: "vqtCNT9xXoiMQYNLqPgqbSPi"
    }
  ]
  const headers: GetHeaderParams[] = [
    {
      key: "referer",
      token: itemUrl
    }
  ]

  return axios.post<{ data: { state: string, url?: string } }>(apiUrl, requestData, genCommonOptions(cookies, headers))
    .then(({ data, status }) => {
      return {
        apiUrl,
        httpStatus: status,
        response: data
      }
    })
}

/** 轮询导出状态 */
export const pollExportStatus = async (params: GetMdDataParams, maxRetries = 3, interval = 2000,
  exportType: 'word' | 'excel' | 'lakeboard' = 'excel') => {

  const { id, token, key, itemUrl } = params
  const apiUrl = `https://taichu-mp.yuque.com/api/docs/${id}/export`

  const requestData = {
    type: exportType,
    force: 0
  }
  const cookies: GetHeaderParams[] = [
    { token, key },
    {
      key: "yuque_ctoken",
      token: "vqtCNT9xXoiMQYNLqPgqbSPi"
    }
  ]
  const headers: GetHeaderParams[] = [
    {
      key: "referer",
      token: itemUrl
    }
  ]

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.post<{ data: { state: string, url?: string } }>(
        apiUrl, requestData, genCommonOptions(cookies, headers))
      if (response.data?.data?.state === 'success' && response.data?.data?.url) {
        return {
          success: true,
          url: response.data.data.url,
          apiUrl,
          httpStatus: response.status
        }
      }

      if (response.data?.data?.state === 'failed') {
        return {
          success: false,
          error: 'Export failed',
          apiUrl,
          httpStatus: response.status
        }
      }

      // 等待指定时间后重试
      await new Promise(resolve => setTimeout(resolve, interval))
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  return {
    success: false,
    error: 'Export timeout',
    apiUrl,
    httpStatus: 408
  }
}

/** 下载导出的文件 */
export const downloadExportedFile = (url: string, params: GetMdDataParams) => {
  const { token, key, itemUrl } = params
  const cookies: GetHeaderParams[] = [
    { token, key },
    {
      key: "yuque_ctoken",
      token: "vqtCNT9xXoiMQYNLqPgqbSPi"
    }
  ]
  const headers: GetHeaderParams[] = [
    {
      key: "referer",
      token: itemUrl
    }
  ]

  if (url.startsWith('/attachments/__temp')) {
    url = "https://taichu-mp.yuque.com" + url
  }

  return axios.get(url, {
    ...genCommonOptions(cookies, headers),
    responseType: 'arraybuffer'
  }).then(({ data, status }) => {
    return {
      data,
      httpStatus: status
    }
  })
}
