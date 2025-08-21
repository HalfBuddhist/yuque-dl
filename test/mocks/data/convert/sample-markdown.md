# Sample Markdown Document

This is a sample markdown document for testing the image conversion functionality.

## Images Section

Here are some test images:

![Local PNG Image](./images/test.png)
![Local JPEG Image](../assets/photo.jpg)
![Remote Image](https://example.com/remote-image.png)
![SVG Icon](./icons/icon.svg)

## Text Content

Some regular text content without images.

### Nested Images

In subdirectories:

![Nested Image](./nested/deep/image.gif)
![Another Image](../../shared/image.webp)

## Mixed Content

Text with ![inline image](./inline.png) in the middle of a paragraph.

Multiple images in one line: ![first](./1.png) and ![second](./2.jpg).

## Edge Cases

![Image with spaces in path](./path with spaces/image.png)
![Image with special chars](./special-chars_123/image.png)
![Empty alt text](./empty-alt.png)
![](./no-alt-text.png)

## Remote Images (Should be skipped)

![HTTP Image](http://example.com/http-image.jpg)
![HTTPS Image](https://example.com/https-image.png)
![FTP Image](ftp://example.com/ftp-image.gif)