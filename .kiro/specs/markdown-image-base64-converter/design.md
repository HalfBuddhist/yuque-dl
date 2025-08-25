# Design Document

## Overview

本设计文档描述了为 yuque-dl 工具添加 markdown 图片 base64 转换功能的技术实现方案。该功能将作为一个新的 CLI 子命令，独立于现有的下载功能，用于将已下载的 markdown 文件中的本地图片链接转换为 base64 编码嵌入的方式。

该功能的核心目标是：
1. 提供一个新的 CLI 子命令 `convert` 
2. 扫描指定目录下的所有 markdown 文件
3. 将 markdown 中的本地图片链接转换为 base64 数据 URI
4. 生成完全自包含的 markdown 文件到新目录
5. 提供清晰的进度反馈和统计信息

## Architecture

### 整体架构

```
CLI Command (convert)
    ↓
Converter Service
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   File Scanner  │  Image Processor │  File Generator │
└─────────────────┴─────────────────┴─────────────────┘
    ↓                    ↓                    ↓
Directory Tree      Base64 Encoder      Output Manager
```

### 模块职责

1. **CLI Command Handler**: 处理新的 `convert` 子命令，解析参数
2. **Converter Service**: 主要的转换服务，协调各个模块
3. **File Scanner**: 扫描目录，找到所有 markdown 文件
4. **Image Processor**: 处理图片转换为 base64
5. **File Generator**: 生成转换后的文件到目标目录
## Components and Interfaces

### 1. CLI Command Interface

```typescript
// 新增 CLI 命令
cli
  .command('convert', '将 markdown 文件中的图片转换为 base64 嵌入')
  .option('-d, --download <dir>', '下载目录（默认：download)')
  .option('-o, --output <dir>', '输出目录 （默认：<download dir>-base64)')
  .option('--overwrite', '覆盖已存在的输出目录', { default: false })
  .action(async (sourceDir: string, options: IConvertOptions) => {
    // 调用转换功能
  })
```

### 2. Core Interfaces

```typescript
interface IConvertOptions {
  /** 输出目录 */
  output?: string
  /** 是否覆盖已存在的目录 */
  overwrite: boolean
}

interface IConvertResult {
  /** 处理的 markdown 文件总数 */
  totalFiles: number
  /** 成功转换的图片数量 */
  convertedImages: number
  /** 跳过的图片数量（远程链接等） */
  skippedImages: number
  /** 警告信息列表 */
  warnings: string[]
  /** 错误信息列表 */
  errors: string[]
}

interface IMarkdownFile {
  /** 文件的相对路径 */
  relativePath: string
  /** 文件的绝对路径 */
  absolutePath: string
  /** 文件内容 */
  content: string
}

interface IImageReference {
  /** 图片的原始 markdown 语法 */
  originalMarkdown: string
  /** 图片的相对路径 */
  imagePath: string
  /** 图片的绝对路径 */
  absoluteImagePath: string
  /** 图片的 alt 文本 */
  altText: string
}
```

### 3. Converter Service

```typescript
class MarkdownImageConverter {
  constructor(
    private sourceDir: string,
    private outputDir: string,
    private options: IConvertOptions
  ) {}

  async convert(): Promise<IConvertResult>
  private async scanMarkdownFiles(): Promise<IMarkdownFile[]>
  private async processMarkdownFile(file: IMarkdownFile): Promise<void>
  private async convertImageToBase64(imagePath: string): Promise<string>
  private extractImageReferences(content: string): IImageReference[]
  private generateOutputPath(relativePath: string): string
}
```

## Data Models

### 图片处理数据流

```
Markdown Content
    ↓ （正则表达式解析）
Image References []
    ↓ （路径解析）
Local Image Files []
    ↓ （文件读取 + Base64 编码）
Base64 Data URIs []
    ↓ （字符串替换）
Updated Markdown Content
```

### 文件结构映射

```
Source Directory Structure:
├── index.md
├── folder1/
│   ├── doc1.md
│   └── img/
│       └── image1.png
└── folder2/
    └── doc2.md

Output Directory Structure:
├── index.md (with base64 images)
└── folder1/
    └── doc1.md (with base64 images)
└── folder2/
    └── doc2.md (with base64 images)
```

## Error Handling

### 错误类型和处理策略

1. **文件系统错误**
   - 源目录不存在：抛出错误，终止执行
   - 输出目录创建失败：抛出错误，终止执行
   - 文件读取失败：记录警告，跳过该文件

2. **图片处理错误**
   - 图片文件不存在：记录警告，保留原始链接
   - 图片文件读取失败：记录警告，保留原始链接
   - 不支持的图片格式：记录警告，保留原始链接

3. **内容处理错误**
   - Markdown 解析错误：记录警告，保留原始内容
   - Base64 编码失败：记录警告，保留原始链接

### 错误恢复机制

- 单个文件处理失败不影响其他文件的处理
- 单个图片转换失败不影响同一文件中其他图片的处理
- 所有错误和警告都会被收集并在最后统一报告

## Testing Strategy

### 单元测试

1. **图片处理测试**
   - 测试各种图片格式的 base64 转换
   - 测试图片文件不存在的情况
   - 测试图片文件权限问题

2. **Markdown 解析测试**
   - 测试各种图片链接格式的识别
   - 测试相对路径解析
   - 测试远程链接的跳过逻辑

3. **文件系统操作测试**
   - 测试目录扫描功能
   - 测试文件复制和目录结构重建
   - 测试输出目录的创建和覆盖逻辑

### 集成测试

1. **端到端转换测试**
   - 使用真实的下载数据进行转换测试
   - 验证转换后的 markdown 文件可以正常显示
   - 验证目录结构的正确性

2. **CLI 命令测试**
   - 测试命令行参数解析
   - 测试各种选项组合
   - 测试错误情况的处理

### 性能测试

1. **大文件处理测试**
   - 测试包含大量图片的 markdown 文件处理性能
   - 测试大尺寸图片的 base64 转换性能

2. **批量处理测试**
   - 测试大量文件的批量处理性能
   - 测试内存使用情况

## Implementation Details

### 图片格式检测和 MIME 类型映射

```typescript
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}
```

### Base64 数据 URI 生成

```typescript
function generateDataUri(imageBuffer: Buffer, mimeType: string): string {
  const base64Data = imageBuffer.toString('base64')
  return `data:${mimeType};base64,${base64Data}`
}
```

### Markdown 图片链接正则表达式

```typescript
// 匹配 markdown 图片语法：![alt](path)
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
```

### 进度显示

使用现有的 `ora` 库显示处理进度：
- 扫描文件阶段显示扫描进度
- 处理文件阶段显示当前处理的文件名
- 完成后显示统计信息

### 文件路径处理

利用现有的 `fixPath` 函数确保路径的正确性，并使用 Node.js 的 `path` 模块进行路径操作：
- 使用 `path.resolve()` 处理绝对路径
- 使用 `path.relative()` 计算相对路径
- 使用 `path.join()` 构建输出路径

### 内存优化

- 逐个处理文件，避免同时加载所有文件到内存
- 处理完成后及时释放文件内容
- 对于大图片文件，考虑添加大小限制警告