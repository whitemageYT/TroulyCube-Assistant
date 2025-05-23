const chalk = require('chalk');

module.exports = {
  info: (msg, ...args) => console.log(chalk.blue('ℹ️ [INFO]'), msg, ...args),
  success: (msg, ...args) => console.log(chalk.green('✅ [SUCCESS]'), msg, ...args),
  error: (msg, ...args) => console.log(chalk.red('❌ [ERROR]'), msg, ...args),
  warn: (msg, ...args) => console.log(chalk.yellow('⚠️ [WARN]'), msg, ...args)
};
