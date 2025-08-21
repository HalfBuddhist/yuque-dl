import log4js from 'log4js'

const getLogger = () => {
  log4js.configure({
    appenders: {
      console: {
        type: 'console',
        layout: {
          type: 'pattern',
          pattern: '%[%c [%p]:%] %m%n'
        }
      },
      file: {
        type: 'file',
        filename: 'yuque-dl.log',
        layout: {
          type: 'pattern',
          pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m%n'
        }
      },
      warnFile: {
        type: 'file',
        filename: 'yuque-dl-warn.log',
        layout: {
          type: 'pattern',
          pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m%n'
        }
      },
      warnFilter: {
        type: 'logLevelFilter',
        appender: 'warnFile',
        level: 'WARN'
      }
    },
    categories: {
      default: {
        appenders: ['console', 'file', 'warnFilter'],
        level: 'info'
      }
    }
  })
  return log4js.getLogger('yuque-dl')
}

export const logger = getLogger()
