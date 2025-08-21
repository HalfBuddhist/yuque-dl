# yuque-dl

语雀知识库下载为本地markdown

![header](https://socialify.git.ci/gxr404/yuque-dl/image?description=1&descriptionEditable=%E8%AF%AD%E9%9B%80%E7%9F%A5%E8%AF%86%E5%BA%93%E4%B8%8B%E8%BD%BD&issues=1&logo=https%3A%2F%2Fraw.githubusercontent.com%2Fgxr404%2Fyuque-dl%2Fmain%2Fdocs%2Fassets%2Flogo.png&name=1&pattern=Circuit%20Board&pulls=1&stargazers=1&theme=Light)

## Prerequisite

- Node.js 18.4 or later

## Install

```bash
npm i -g yuque-dl
```

## Usage

```bash
$ yuque-dl --help

  Usage:
    $ yuque-dl <url>

  Commands:
    <url>                语雀知识库url
    server <serverPath>  启动web服务
    convert <sourceDir>  将 markdown 文件中的图片转换为 base64 嵌入

  For more info, run any command with the `--help` flag:
    $ yuque-dl --help
    $ yuque-dl server --help
    $ yuque-dl convert --help

  Options:
    -d, --distDir <dir>                  下载的目录
                                          └─ eg: -d download (默认值: download)
    -i, --ignoreImg                      忽略图片不下载 (默认值: false)
    --ignoreAttachments [fileExtension]  忽略附件, 可选带上忽略的附件文件后缀(多种后缀逗号分割)
                                          └─ eg: --ignoreAttachments mp4,pdf // 忽略后缀名mp4,pdf的附件
                                          └─ eg: --ignoreAttachments // 忽略所有附件 (默认值: false)
    -k, --key <key>                      语雀的cookie key， 默认是 "_yuque_session"， 在某些企业版本中 key 不一样
    -t, --token <token>                  语雀的cookie key 对应的值 
    --toc                                是否输出文档toc目录 (默认值: false)
    --incremental                        开启增量下载[初次下载加不加该参数没区别] (默认值: false)
    --convertMarkdownVideoLinks          转化markdown视频链接为video标签 (默认值: false)
    --hideFooter                         是否禁用页脚显示[更新时间、原文地址...] (默认值: false)
    -h, --help                           显示帮助信息
    -v, --version                        显示当前版本
```

### Start

```bash
# url 为对应需要的知识库地址
yuque-dl "https://www.yuque.com/yuque/thyzgp"
```

### Convert 图片转换功能

将已下载的 markdown 文件中的本地图片链接转换为 base64 编码嵌入，生成完全自包含的 markdown 文件。

```bash
# 基本用法：转换指定目录下的所有 markdown 文件
yuque-dl convert ./download/知识库名称

# 指定输出目录
yuque-dl convert ./download/知识库名称 -o ./converted-docs

# 覆盖已存在的输出目录
yuque-dl convert ./download/知识库名称 --overwrite
```

#### Convert 命令选项

```bash
$ yuque-dl convert --help

  Usage:
    $ yuque-dl convert <sourceDir>

  Options:
    -o, --output <dir>  输出目录 (默认：<sourceDir>-base64)
    --overwrite         覆盖已存在的输出目录 (默认值: false)
    -h, --help          显示帮助信息
```

#### 功能特性

- ✅ 自动扫描目录下的所有 markdown 文件
- ✅ 支持多种图片格式（jpg, png, gif, svg, webp, bmp）
- ✅ 智能处理相对路径和绝对路径
- ✅ 跳过远程图片链接（http/https）
- ✅ 保持原有目录结构
- ✅ 详细的进度显示和统计信息
- ✅ 完善的错误处理和警告提示

#### 使用场景

1. **文档分享**：生成完全自包含的 markdown 文件，无需额外的图片文件
2. **文档备份**：将图片嵌入到 markdown 中，避免图片文件丢失
3. **简化部署**：减少文件依赖，简化文档部署流程

#### 注意事项

- 转换后的文件会比原文件大（base64 编码会增加约 33% 的大小）
- 大图片文件会显著增加 markdown 文件大小
- 远程图片链接（http/https）不会被转换，会保持原样并记录警告

## Example

![demo](https://github.com/gxr404/yuque-dl/assets/17134256/98fbbc81-91d4-47f8-9316-eb0ef060d6be)

## 其他场景

### 私有知识库

通过别人私有知识库 分享的链接，需使用`-t`添加token才能下载

```bash
yuque-dl "https://www.yuque.com/yuque/thyzgp" -t "abcd..."
```

[token的获取请看](./docs/GET_TOEKN.md)

### 企业私有服务

企业服务有自己的域名(黄色语雀logo)，非`yuque.com`结尾, 如`https://yuque.antfin.com/r/zone`

这种情况 token的key不唯一, 不一定是为`_yuque_session` 需用户使用 `-k` 指定 token的key,`-t` 指定 token的值。

至于`key`具体是什么只能靠用户自己在 `浏览器Devtools-> Application -> Cookies` 里找了🤔

### 公开密码访问的知识库

> [!WARNING]
> 下载"公开密码访问的知识库" 前提是需要知道别人设置的密码，输入密码后拿cookie进行下载，**无法做到破解密码**, 请须知

![public_pwd](https://github.com/gxr404/yuque-dl/assets/17134256/b546a9a3-68f0-4f76-b450-6b16f464db5d)

⚠️ 公开密码访问的知识库两种情况:

- 已经登录语雀，访问需要密码的知识库 输入密码后使用`_yuque_session`这个cookie

    ```bash
    yuque-dl "url" -t "_yuque_session的值"
    ```

- 未登录语雀，访问需要密码的知识库 输入密码后需要使用`verified_books`/`verified_docs`这个cookie

    ```bash
    yuque-dl "url" -k "verified_books" -t "verified_books的值"
    ```

## 内置启动web服务可快速预览

使用[`vitepress`](https://vitepress.dev/)快速启动一个web服务提供可预览下载的内容

```bash
yuque-dl server ./download/知识库/

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

![server](https://github.com/gxr404/yuque-dl/assets/17134256/6d3a06cd-20b1-4eca-ae75-d9a90614336f)

## Feature

- [x] 支持下载中断继续
- [x] 支持图片下载本地
- [x] 支持下载分享私有的知识库
- [x] 支持转换表格类型的文档 (ps: 表格内插入图表暂不支持)
- [x] 添加toc目录功能
- [x] 添加测试
- [x] 添加附件下载
- [x] 图片转 base64 嵌入功能（convert 命令）
- [ ] 支持其他文档类型？🤔
- [ ] 直接打包成可执行文件 🤔

## 常见错误

1. 由于token可能含有 特殊字符导致参数识别错误

```bash
yuque-dl "https://www.yuque.com/yuque/thyzgp" -t "-a123"
yuque-dl [ERROR]: Unknown option `-1`
```

解决方案

```bash
yuque-dl "https://www.yuque.com/yuque/thyzgp" -t="-a123"
```

2. 附件下载失败，需设置登录token

附件文件下载需要用户登录token，即使是完全公开的知识库，下载附件也可能需要

完全公开的知识库未登录的情况下查看附件:

![attachments](https://github.com/user-attachments/assets/6e764abf-0da6-4fb8-ab96-7d027830b291)

3. Convert 命令相关问题

**问题：转换后的文件很大**
- 原因：base64 编码会增加约 33% 的文件大小
- 解决方案：考虑只转换小图片，或者使用压缩工具处理图片

**问题：某些图片没有被转换**
- 可能原因：
  - 图片文件不存在或路径错误
  - 图片是远程链接（http/https），会被跳过
  - 图片格式不支持
- 解决方案：检查控制台的警告信息，确认图片路径和格式

**问题：输出目录已存在**
- 解决方案：使用 `--overwrite` 参数强制覆盖，或手动删除输出目录

```bash
# 强制覆盖已存在的输出目录
yuque-dl convert ./download/知识库名称 --overwrite
```

## Tips

由于网络波动下载失败的，重新运行即可，已下载的进度不会受到影响
