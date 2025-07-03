const crypto = require('crypto');

/**
 * 生成唯一的转换ID
 * @param {string} url - 原始URL
 * @returns {string} 生成的唯一ID
 */
function generateConvertedId(url) {
    return crypto.createHash('sha256').update(url + Date.now()).digest('hex').substring(0, 12);
}

module.exports = {
    generateConvertedId
};
