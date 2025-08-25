# Requirements Document

## Introduction

为 yuque-dl 工具添加一个新的子命令功能，用于将已下载的 markdown 文件中的图片链接转换为 base64 编码嵌入的方式。该功能不会改动现有的主要下载功能，而是作为一个独立的后处理工具，对已下载的 markdown 文件进行转换处理。

转换后的文件将生成到新的目录中，原始的图片文件将被移除（因为已经嵌入到 markdown 中），从而实现 markdown 文件的完全自包含。

## Requirements

### Requirement 1

**User Story:** 作为用户，我希望能够通过一个新的子命令将已下载的 markdown 文件中的图片链接转换为 base64 编码嵌入，以便获得完全自包含的 markdown 文件。

#### Acceptance Criteria

1. WHEN 用户执行新的子命令 THEN 系统 SHALL 提供一个新的 CLI 命令用于转换功能
2. WHEN 用户指定源目录 THEN 系统 SHALL 扫描该目录下的所有 markdown 文件
3. WHEN 系统找到 markdown 文件中的图片链接 THEN 系统 SHALL 将本地图片文件转换为 base64 编码并嵌入到 markdown 中
4. WHEN 转换完成 THEN 系统 SHALL 将转换后的 markdown 文件保存到新的目录中

### Requirement 2

**User Story:** 作为用户，我希望转换过程能够正确处理各种图片格式和路径，确保转换的准确性和完整性。

#### Acceptance Criteria

1. WHEN 系统遇到相对路径的图片链接 THEN 系统 SHALL 正确解析相对路径并找到对应的图片文件
2. WHEN 系统遇到不同格式的图片文件（jpg, png, gif, svg等） THEN 系统 SHALL 正确识别图片格式并生成对应的 base64 数据 URI
3. WHEN 图片文件不存在 THEN 系统 SHALL 记录警告信息但继续处理其他图片
4. WHEN markdown 文件中包含非本地图片链接（http/https） THEN 系统 SHALL 跳过这些链接不进行转换并记录警告信息

### Requirement 3

**User Story:** 作为用户，我希望转换后的文件能够保持原有的目录结构，并且输出目录中只包含转换后的 markdown 文件。

#### Acceptance Criteria

1. WHEN 转换完成 THEN 系统 SHALL 在指定的输出目录中重建与源目录相同的目录结构
2. WHEN markdown 文件转换完成 THEN 系统 SHALL 将转换后的文件保存到对应的目录位置
3. WHEN 复制文件到输出目录 THEN 系统 SHALL 只复制 markdown 文件，不复制图片文件（因为图片已嵌入）
4. WHEN 处理目录结构 THEN 系统 SHALL 不在输出目录中创建图片相关的目录

### Requirement 4

**User Story:** 作为用户，我希望能够配置转换行为，包括指定源目录、输出目录等选项。

#### Acceptance Criteria

1. WHEN 用户执行转换命令 THEN 系统 SHALL 接受源目录参数指定要转换的 markdown 文件位置
2. WHEN 用户指定输出目录 THEN 系统 SHALL 将转换后的文件保存到指定目录
3. IF 用户未指定输出目录 THEN 系统 SHALL 使用默认的输出目录名称（如源目录名 + "-base64"）
4. WHEN 输出目录已存在 THEN 系统 SHALL 提示用户确认是否覆盖或提供覆盖选项

### Requirement 5

**User Story:** 作为用户，我希望转换过程能够提供清晰的进度反馈和结果统计。

#### Acceptance Criteria

1. WHEN 转换开始 THEN 系统 SHALL 显示找到的 markdown 文件总数
2. WHEN 处理每个文件 THEN 系统 SHALL 显示当前处理的文件名和进度
3. WHEN 转换完成 THEN 系统 SHALL 显示转换统计信息（处理的文件数、转换的图片数、跳过的图片数等）
4. WHEN 遇到错误或警告 THEN 系统 SHALL 记录详细的错误信息供用户查看