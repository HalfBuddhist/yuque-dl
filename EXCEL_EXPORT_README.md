# Excel Export Functionality

This implementation adds support for exporting Yuque sheet documents as Excel files using Yuque's export API.

## How it works

1. **Request Export**: Sends a POST request to `/api/docs/{articleUrl}/export` with export type "word"
2. **Poll Status**: Continuously checks the export status until completion
3. **Download File**: Downloads the exported file from the provided URL
4. **Save as Excel**: Saves the file with `.xlsx` extension

## API Functions

### `requestDocExport(params, exportType)`
Initiates the export process.

**Parameters:**
- `params`: Object containing `articleUrl`, `bookId`, `token`, `key`, `host`
- `exportType`: 'word' or 'excel' (defaults to 'excel')

**Returns:** Export request response

### `pollExportStatus(params, maxRetries, interval)`
Polls the export status until completion.

**Parameters:**
- `params`: Same as above
- `maxRetries`: Maximum number of retry attempts (default: 30)
- `interval`: Polling interval in milliseconds (default: 2000)

**Returns:** Status result with success flag and download URL

### `downloadExportedFile(url, params)`
Downloads the exported file.

**Parameters:**
- `url`: Download URL from the export status response
- `params`: Object containing `token` and `key`

**Returns:** File data as ArrayBuffer

### `downloadSheetAsExcel(reqParams, saveFilePath, articleTitle, progressBar)`
Complete workflow for downloading sheet documents as Excel files.

## Integration

The functionality is automatically integrated into the article download process. When a document of type "sheet" is encountered, it will:

1. Show a progress spinner with "导出 [title] 表格为Excel中..."
2. Execute the complete export workflow
3. Save the file with `.xlsx` extension instead of `.md`
4. Display success message with file path

## Error Handling

The implementation includes comprehensive error handling for:
- Export request failures
- Polling timeouts
- Download failures
- File save errors

All errors are properly propagated with descriptive messages in Chinese.

## Example Usage

```javascript
// Manual usage
const params = {
  articleUrl: 'your-article-id',
  bookId: 12345,
  token: 'your-session-token',
  key: '_yuque_session',
  host: 'https://your-domain.yuque.com'
};

try {
  await downloadSheetAsExcel(params, './output.xlsx', 'My Sheet', progressBar);
  console.log('Excel export completed successfully!');
} catch (error) {
  console.error('Export failed:', error.message);
}
```

## Notes

- The export API uses "word" format which actually exports as Excel for sheet documents
- Files are saved with `.xlsx` extension regardless of the original format
- The implementation includes proper progress indication and user feedback
- All text messages are in Chinese to match the existing codebase style