/**
 * config.js
 * @author yinyong#sogou-inc.com
 * @version 0.0.2
 */

var fs = require("fs");
var path = require("path");
var utils = require("./utils");
//var logger=require("./tool/logger");


var manifestFile = "./manifest.json";
/**
 * 同步方法，实时从manifest中获取配置信息。
 * 如果environment为空，优先从local对象中取值，取不到则尝试从
 * 直接对象中取值；如果非空，则从对应子对象中取值，如：
 * <code>
 * {
 *     "static_prefix":".",
 *     "local":{
 *         "static_prefix":"./"
 *     },
 *     "online":{
 *         "static_prefix":"../"
 *     }
 * }
 * </code>
 *
 * 则get("static_prefix")=="./"，而get("static_prefix","online")=="../"。
 * 搜索不到则返回undefined。
 *
 * @param  {String} key 配置名称
 * @param  {String} environment 搜索位置
 * @return {Object}     配置值
 */

var getConfig = function(key, environment) {
    if (!utils.isString(key)) {
        console.error("key MUST BE a string,but it's a %s".error, typeof key);
        return;
    }

    try {
        var content = fs.readFileSync(manifestFile, {
            encoding: 'utf-8'
        });
        content = utils.rmComment(content);
        //console.log(content)
        var json = JSON.parse(content);
        //从里向外搜索
        //environment为null/undefined时优先取local内的值
        return environment ? (json[environment] ? json[environment][key] : undefined) : (json['local']?(json['local'][key]||json[key]):json[key]);
    } catch (e) {
        console.error("[EMERGENCY]config-get(%s):%s\r\nPlease check your manifest.json.".error,key, e);
    }
}

var _config = {
    manifestFile: manifestFile,
    //set template dir configure
    templateDir: getConfig("template_dir") || ("." + path.sep + "template"),
    staticDir: "." + path.sep + "static",
    dataDir: "." + path.sep + "_data",
    templateSuffix: "tpl",
    accessSuffix: "ut",
    get: function(key, proj) {
        return getConfig(key, proj);
    }
};

module.exports = _config;