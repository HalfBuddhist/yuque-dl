# Excel导出功能使用示例

## 🎯 功能概述

当下载语雀的表格类型文档时，系统会自动导出为Excel文件(.xlsx)而不是Markdown文件。

## 📋 使用方法

### 自动导出 (推荐)

当你使用yuque-dl下载包含表格文档的知识库时，系统会自动处理：

```bash
# 正常下载命令，表格文档会自动导出为Excel
yuque-dl https://www.yuque.com/your-space/your-book
```

**输出示例**:
```
导出 "销售数据统计表" 表格为Excel中...
✅ 表格已导出为Excel: ./output/销售数据统计表.xlsx
```

### 手动调用API

如果需要在代码中手动调用：

```typescript
import { requestDocExport, pollExportStatus, downloadExportedFile } from 'yuque-dl'

async function exportSheetToExcel() {
  const params = {
    articleUrl: 'your-sheet-document-id',
    bookId: 12345,
    token: 'your-session-token',
    key: '_yuque_session',
    host: 'https://your-domain.yuque.com'
  }

  try {
    // 1. 请求导出
    console.log('请求导出...')
    await requestDocExport(params, 'word')

    // 2. 轮询状态
    console.log('等待导出完成...')
    const result = await pollExportStatus(params)
    
    if (result.success) {
      // 3. 下载文件
      console.log('下载文件...')
      const fileData = await downloadExportedFile(result.url!, {
        token: params.token,
        key: params.key
      })

      // 4. 保存文件
      await fs.writeFile('./output.xlsx', Buffer.from(fileData.data))
      console.log('✅ Excel文件保存成功!')
    }
  } catch (error) {
    console.error('导出失败:', error.message)
  }
}
```

## 🔧 配置选项

### 导出类型
```typescript
// 导出为Word格式 (实际上对于表格会导出为Excel)
await requestDocExport(params, 'word')

// 导出为Excel格式
await requestDocExport(params, 'excel')
```

### 轮询配置
```typescript
// 自定义轮询参数
await pollExportStatus(params, 
  30,    // 最大重试次数
  2000   // 轮询间隔(毫秒)
)
```

## 📁 文件输出

### 文件命名规则
- 原始Markdown文件: `文档标题.md`
- Excel导出文件: `文档标题.xlsx`

### 目录结构
```
output/
├── 普通文档.md          # 普通文档仍为Markdown
├── 表格文档.xlsx        # 表格文档自动导出为Excel
└── img/                 # 图片目录
    └── ...
```

## 🎨 用户体验

### 进度提示
```
导出 "月度销售报表" 表格为Excel中...
✅ 表格已导出为Excel: ./output/月度销售报表.xlsx
```

### 错误处理
```
❌ 导出失败: 网络连接超时
❌ 导出失败: 文档不存在
❌ 导出失败: 权限不足
```

## 🔍 支持的文档类型

| 文档类型 | 处理方式 | 输出格式 |
|---------|---------|---------|
| 普通文档 (doc) | Markdown转换 | `.md` |
| 表格文档 (sheet) | **Excel导出** | `.xlsx` |
| 画板文档 (board) | 暂不支持 | - |
| 数据表 (table) | 暂不支持 | - |

## ⚡ 性能特点

- **自动检测**: 无需手动指定，自动识别表格类型
- **异步处理**: 不阻塞其他文档下载
- **进度反馈**: 实时显示导出进度
- **错误恢复**: 导出失败不影响其他文档
- **格式保持**: 保持原始表格格式和数据

## 🛠️ 技术实现

基于语雀官方导出API实现：
1. POST `/api/docs/{id}/export` - 请求导出
2. GET `/api/docs/{id}/export` - 轮询状态  
3. GET `{export_url}` - 下载文件
4. 保存为 `.xlsx` 格式

## 📞 故障排除

### 常见问题

**Q: 导出的Excel文件打不开？**
A: 确保网络连接稳定，重试导出过程。

**Q: 导出速度很慢？**
A: 表格数据量大时导出需要时间，请耐心等待。

**Q: 某些表格导出失败？**
A: 检查是否有访问权限，或表格是否包含特殊内容。

### 调试模式
```bash
# 启用详细日志
DEBUG=yuque-dl:* yuque-dl https://your-url
```

## 🎉 总结

Excel导出功能让语雀表格文档的下载变得更加实用，保持了原始的表格格式，方便后续编辑和分析。功能已完全集成到现有工作流程中，无需额外配置即可使用。