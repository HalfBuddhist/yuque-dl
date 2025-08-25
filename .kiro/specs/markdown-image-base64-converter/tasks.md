# Implementation Plan

- [x] 1. 创建核心类型定义和接口
  - 在 `src/types/index.ts` 中添加转换功能相关的 TypeScript 接口定义
  - 定义 `IConvertOptions`, `IConvertResult`, `IMarkdownFile`, `IImageReference` 等接口
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 2. 实现图片处理核心功能
- [x] 2.1 创建图片格式检测和 MIME 类型映射工具
  - 创建 `src/convert/imageUtils.ts` 文件
  - 实现图片格式检测函数和 MIME 类型映射常量
  - 实现 base64 数据 URI 生成函数
  - _Requirements: 2.2_

- [x] 2.2 实现图片转 base64 编码功能
  - 在 `src/convert/imageUtils.ts` 中实现图片文件读取和 base64 转换
  - 添加错误处理，对不存在或无法读取的图片文件记录警告
  - 编写单元测试验证各种图片格式的转换功能
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. 实现 Markdown 文件处理功能
- [x] 3.1 创建 Markdown 解析和图片链接提取功能
  - 创建 `src/convert/markdownProcessor.ts` 文件
  - 实现正则表达式匹配 markdown 图片语法的功能
  - 实现提取图片引用信息的函数，包括路径解析和 alt 文本提取
  - _Requirements: 2.1, 2.4_

- [x] 3.2 实现 Markdown 内容转换功能
  - 在 `src/convert/markdownProcessor.ts` 中实现将本地图片链接替换为 base64 数据 URI
  - 实现跳过远程图片链接（http/https）的逻辑并记录警告信息
  - 添加内容处理错误的异常处理机制
  - _Requirements: 2.4, 3.1_

- [x] 4. 实现文件系统操作功能
- [x] 4.1 创建目录扫描和文件发现功能
  - 创建 `src/convert/fileScanner.ts` 文件
  - 实现递归扫描目录找到所有 markdown 文件的功能
  - 实现文件路径处理，包括相对路径和绝对路径的转换
  - _Requirements: 1.2, 3.1_

- [x] 4.2 实现输出目录管理功能
  - 在 `src/convert/fileScanner.ts` 中实现输出目录的创建和管理
  - 实现目录结构重建功能，确保输出目录保持与源目录相同的结构
  - 实现覆盖选项的处理逻辑
  - _Requirements: 3.2, 4.3, 4.4_

- [x] 5. 创建主要的转换服务类
- [x] 5.1 实现 MarkdownImageConverter 核心类
  - 创建 `src/convert/converter.ts` 文件
  - 实现 `MarkdownImageConverter` 类的基本结构和构造函数
  - 实现主要的 `convert()` 方法，协调各个模块完成转换流程
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 5.2 集成各个功能模块
  - 在 `MarkdownImageConverter` 类中集成文件扫描、图片处理和文件生成功能
  - 实现错误收集和统计信息生成
  - 添加进度显示功能，使用现有的 `ora` 库显示处理进度
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. 实现 CLI 命令集成
- [x] 6.1 在 CLI 中添加新的 convert 子命令
  - 修改 `src/cli.ts` 文件，添加新的 `convert` 子命令定义
  - 实现命令行参数解析，包括源目录、输出目录和覆盖选项
  - 添加命令帮助信息和使用示例
  - _Requirements: 1.1, 4.1, 4.2, 4.4_

- [x] 6.2 创建 convert 命令的入口函数
  - 创建 `src/convert/index.ts` 文件作为转换功能的主入口
  - 实现命令行参数验证和错误处理
  - 集成 `MarkdownImageConverter` 类并处理转换结果的显示
  - _Requirements: 5.4_

- [x] 7. 添加错误处理和日志记录
- [x] 7.1 实现全面的错误处理机制
  - 在各个模块中添加适当的错误处理和恢复机制
  - 确保单个文件或图片处理失败不影响整体流程
  - 实现错误信息的收集和格式化显示
  - _Requirements: 2.3, 5.4_

- [x] 7.2 集成现有的日志系统
  - 使用项目现有的 `logger` 工具记录转换过程中的信息
  - 实现警告信息的记录，包括跳过的远程链接和处理失败的图片
  - 添加详细的统计信息输出
  - _Requirements: 2.4, 5.3, 5.4_

- [ ] 8. 编写测试用例
- [x] 8.1 创建单元测试
  - 创建 `test/convert/` 目录结构
  - 为图片处理、Markdown 解析、文件扫描等核心功能编写单元测试
  - 创建测试用的 mock 数据和图片文件
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8.2 创建集成测试
  - 编写端到端的转换功能测试
  - 测试 CLI 命令的各种参数组合
  - 验证转换后文件的正确性和目录结构
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 9. 更新项目文档
- [x] 9.1 更新 README 文档
  - 在项目 README.md 中添加新的 convert 子命令的使用说明
  - 添加使用示例和常见问题解答
  - 更新命令行帮助信息
  - _Requirements: 1.1, 4.1_

- [x] 9.2 更新类型定义文件
  - 确保 TypeScript 类型定义文件正确生成
  - 验证新增接口和类型的导出
  - 更新相关的 d.ts 文件
  - _Requirements: 1.1_