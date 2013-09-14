/**
 * timestamp.js
 * @author yinyong#sogou-inc.com
 * @version 0.0.1
 */

var config = require("../config");
var filter = require("../filter");
var utils = require("../utils");
var sysUrl = require("url");
var systemPath = require("path");
var fs = require("fs");

var timeStampName = config.get("timestamp_name") || "t";

/**
 * 各种替换,do this after merge css/js and render html.
 */
var _proto_ = {
    /**
     * 替换HTML文件中的相对链接
     * @param  {[type]} content [description]
     * @param  {[type]} reg     [description]
     * @return {[type]}         [description]
     */
    _addToHtmlCommon: function(content, reg) {
        if (typeof content !== 'string' || !content || content.constructor !== String) {
            console.log("HTML content must be a non-empty string".warn);
            return content;
        }
        var self = this;

        return content.replace(reg, function(k) {
            //取出文件路径
            var urlBeforeReplace = RegExp.$2;

            var url = filter(urlBeforeReplace); //This url is relative to /

            var parsedUrl = sysUrl.parse(url, true);

            //有协议的或//开头的(相当于有协议)的不添加时间戳
            if (parsedUrl.protocol || /^\/\//.test(url)) {
                console.log("[NOTIMESTAMP]%s is not a relative path file.".warn, url);
                return k;
            }
            //从build里获取静态资源，因为这里的静态资源是生成好的，时间戳准确
            var filePath = systemPath.join(self.staticResDir, parsedUrl.pathname);

            var timeStamp = "";
            if (!fs.existsSync(filePath)) {
                console.log("[NOTFOUND]%s does not exist but used.".warn, filePath);
            } else {
                timeStamp = Stamp.getTimeStamp(filePath);
            }

            //以t做参数，已存在则不添加
            if (undefined === parsedUrl.query[timeStampName]) {
                //判断是否已经有GET参数
                if (parsedUrl.search) {
                    return k.replace(urlBeforeReplace, urlBeforeReplace + "&" + timeStampName + "=" + timeStamp);
                } else {
                    return k.replace(urlBeforeReplace, urlBeforeReplace + "?" + timeStampName + "=" + timeStamp);
                }
            } else {
                console.log("[DUMPLICATE]%s may already have a timeStamp".warn, parsedUrl.pathname);
            }
            return k;

        });
    },
    /**
     * 向HTML代码中的link添加时间戳。
     * @param {[String]} content HTML代码
     * @return {[String]} 添加完时间戳后的代码
     */
    addToHtmlLink: function(content) {
        var linkReg = /<link.* href=(['"])(.*?\.css.*?)\1/img;
        return this._addToHtmlCommon(content, linkReg);
    },
    /**
     * 向HTML代码中的script添加时间戳。
     * @param {[String]} content HTML代码
     * @return {[String]} 添加完时间戳后的代码
     */
    addToHtmlScript: function(content) {
        var scriptReg = /<script.* src=(['"])(.*?\.js.*?)\1/img;
        return this._addToHtmlCommon(content, scriptReg);
    },
    /**
     * 向CSS代码中的图片URL添加链接。
     * @param {[String]} content CSS代码内容
     * @param {[String]} baseDir CSS的目录，因为图片资源的路径是相对于CSS文件的。
     * @return {[String]} 添加完时间戳后的代码
     */
    addToCssUrl: function(content, baseDir) {
        if (typeof content !== 'string' || !content || content.constructor !== String) {
            console.log("[FATAL]content must be a non-empty string".warn);
            return content;
        }
        return content.replace(/url\(['"]?(.*?)['"]?\)/img, function(k) {
            //取出url
            var urlBeforeReplace = RegExp.$1; //k.replace(/url\(['"]?(.*?)['"]?\)/i, "$1");
            //重要：
            //类似@img_prefix@/static/img/s.png之类的
            //路径在替换前后都可能找不到因而不能计算时间戳，
            //但是应用无project的filter是利用manifest.json中
            //对象的直接变量进行替换，应该可能找到源文件。
            var url = filter(urlBeforeReplace);

            //解析URL获取GET参数
            var parsedUrl = sysUrl.parse(url, true);

            //带协议的、about:blank或者是图片base64的均不加时间戳
            if (parsedUrl.protocol || /(^about:blank|^data:image|^\/\/)/i.test(url)) {
                console.log("[NOTIMESTAMP]%s is not a relative path file.".warn, url);
                return k;
            }

            //图片途径相对于CSS文件
            var imgFilePath = systemPath.join(baseDir, parsedUrl.pathname);

            //计算时间戳，文件不存在则置空
            var timeStamp = "";
            if (fs.existsSync(imgFilePath))
                timeStamp = Stamp.getTimeStamp(imgFilePath);
            else
                console.log("[NOTFOUND]%s does not exist but used.".warn, imgFilePath)

            //以t做参数，已存在则不添加
            if (undefined === parsedUrl.query[timeStampName]) {
                //判断是否已经有GET参数
                if (parsedUrl.search) {
                    return "url(" + urlBeforeReplace + "&" + timeStampName + "=" + timeStamp + ")";
                } else {
                    return "url(" + urlBeforeReplace + "?" + timeStampName + "=" + timeStamp + ")";
                }
            } else {
                console.log("[DUMPLICATE]%s may already have a timeStamp".warn, url);
            }
            return k;
        });
    }
};

//staticResDir should be ./statis or ./build/.static etc. without css/js or img.
var Stamp = function(staticResDir) {
    this.staticResDir = staticResDir || ".";
};

Stamp.prototype = _proto_;
/**
 * 获取文件时间戳，文件不存在或读取出错则返回空字符串。
 * @param  {[String]} file 文件路径
 * @return {[String]}      时间戳
 */
Stamp.getTimeStamp = function(file) {
    try {
        var content = fs.readFileSync(file);
        var md5 = utils.md5(content);
        var ret = parseInt(md5.slice(0, 16), 16) % 997 + "" + parseInt(md5.slice(16), 16) % 997;
        //保证六位时间戳
        if (ret.length < 6) {
            ret = String(Math.pow(10, (6 - ret.length)) | 0).slice(1) + ret;
        }
        return ret;
    } catch (e) {
        console.log("[FATAL]%s read failed:%s".error,file,e)
        return "";
    }
};

module.exports = Stamp;