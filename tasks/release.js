/*
 * mlf_cache
 * https://github.com/yangxiaoxiao23/mlf_cache
 *
 * Copyright (c) 2015 yangxiaoxiao23
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
    
	var crypto = require('crypto');
	var cheerio = require("cheerio");

	var mainJsMd5Path, requireJsMd5Path, styleMd5Path;

	//1.读取xd/js/config.js文件获取所有的模块映射
	//2.通过映射的路径去计算文件的MD5
	//3.通过对比xd/js/map映射文件,如果文件MD5发生改变,则更新映射

	function readConfigFile(data){
		var basePath = data.basePath;
		var configPath = data.configPath;
		grunt.log.ok('正在读取config.js');
		var data = grunt.file.read(basePath + configPath);

		var reg = new RegExp('{[^{^}]+}','gim');
        var config = JSON.parse(reg.exec(data)); //获取配置 {key: value}

		grunt.log.ok('读取config.js完成');
		return config;

		return;
	}

	function generateMd5File(configs, data){
		var basePath = data.basePath;
		var mapPath = data.mapPath;
		var routerJs = data.routerJs;
		var publishPath = data.publishPath;

		var routerJsMd5Path;

		var mapValue = {};
		for(var fileName in configs) {
			
			
			var filePath = configs[fileName];
			if(filePath.indexOf('.') == -1){ //如果文件没有加后缀,则默认添加为.js
				filePath += '.js';
			}
			var subPath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
			var ext = filePath.substring(filePath.lastIndexOf('.'));

			//grunt.log.ok('检测文件:' + filePath);

			var fileContent = grunt.file.read(basePath + filePath);
			var md5 = md5File(fileContent);

			mapValue[fileName] = subPath + fileName + '_' + md5;
			if(ext != '.js'){
				mapValue[fileName] += ext;
			}
			var md5FilePath = publishPath + subPath + fileName + '_' +  md5 + ext;

			//grunt.log.ok('生成的文件:' + md5FilePath);
			//
			//如果是router.js 则记下他生成的文件路径
			var mapFileName = routerJs.substring(routerJs.lastIndexOf('/') + 1, routerJs.lastIndexOf('.'));
			if(mapFileName === fileName){
				routerJsMd5Path = md5FilePath;
			}
			grunt.file.write(md5FilePath, fileContent);
		}
		requireJsMd5Path = mapValue['require'];
		styleMd5Path = mapValue['style'];
		generateMd5Map(data, mapValue, routerJsMd5Path);
		//grunt.file.write(basePath + mapPath, );
	}

	/**
	 * 生成map md5文件
	 * @param  {[type]} data     [description]
	 * @param  {[type]} mapValue [description]
	 * @return {[type]}          [description]
	 */
	function generateMd5Map(data, mapValue, routerJsMd5Path){
		var mapPath = data.mapPath;
		var publishPath = data.publishPath;
		var subPath = mapPath.substring(0, mapPath.lastIndexOf('/') + 1);
		var ext = mapPath.substring(mapPath.lastIndexOf('.'));
		var fileName = mapPath.substring(mapPath.lastIndexOf('/') + 1, mapPath.lastIndexOf('.'));

		var fileContent = JSON.stringify(mapValue);
		var md5 = md5File(fileContent);
		var md5FilePath = publishPath + subPath + fileName + '_' +  md5 + ext;

		fileContent = 'define(function(){return' + JSON.stringify(mapValue) + '});'
		grunt.log.ok('生成的map.js文件:' + md5FilePath);
		grunt.file.write(md5FilePath, fileContent);
		generateMd5MainJsPublish(data, fileName, fileName + '_' +  md5);

		generateMd5RouterJs(data, fileName, fileName + '_' +  md5, routerJsMd5Path);
	}	

	/**
	 * 生成main.js的MD5文件
	 * @param  {[type]} data           [description]
	 * @param  {[type]} mapFileName    [description]
	 * @param  {[type]} md5MapFileName [description]
	 * @return {[type]}                [description]
	 */
	function generateMd5MainJsPublish(data, mapFileName, md5MapFileName){
		var mainJsPath = data.mainJs;
		var requireJsBaseUrl = data.requireJsBaseUrl;

		var fileContent = grunt.file.read(data.basePath + mainJsPath);

		fileContent = fileContent.replace("['" + mapFileName + "']", "['" + md5MapFileName + "']");
		fileContent = fileContent.replace(/.*baseUrl.*,/gi, 'baseUrl:"' + requireJsBaseUrl + '",');

		var publishPath = data.publishPath;
		var subPath = mainJsPath.substring(0, mainJsPath.lastIndexOf('/') + 1);
		var ext = mainJsPath.substring(mainJsPath.lastIndexOf('.'));
		var fileName = mainJsPath.substring(mainJsPath.lastIndexOf('/') + 1, mainJsPath.lastIndexOf('.'));

		var md5 = md5File(fileContent);
		var md5FilePath = publishPath + subPath + fileName + '_' +  md5 + ext;

		mainJsMd5Path = subPath + fileName + '_' +  md5 + ext;

		grunt.log.ok('生成的main.js文件:' + md5FilePath);
		grunt.file.write(md5FilePath, fileContent);
	}

	/**
	 * 生成router.js 的md5
	 * @param  {[type]} data            [description]
	 * @param  {[type]} mapFileName     [description]
	 * @param  {[type]} md5MapFileName  [description]
	 * @param  {[type]} routerJsMd5Path [description]
	 * @return {[type]}                 [description]
	 */
	function generateMd5RouterJs(data, mapFileName, md5MapFileName, routerJsMd5Path){
		var fileContent = grunt.file.read(routerJsMd5Path);
		fileContent = fileContent.replace("'" + mapFileName + "'", "'" + md5MapFileName + "'");
		grunt.file.write(routerJsMd5Path, fileContent);
	}

	function generateHomePage(data){
		var srcPath = data.homePage.src;
		var toPath = data.homePage.to;
		var fileContent = grunt.file.read(srcPath);
		//fileContent = fileContent.replace("'" + mapFileName + "'", "'" + md5MapFileName + "'");
		//
		
		fileContent = generateHomePageMainJs(data, fileContent);
		grunt.log.ok('生成的香迪美容的首页文件:' + toPath);

		grunt.file.write(toPath, fileContent);
	}

	function generateHomePageMainJs(data, fileContent){
		var $ = cheerio.load(fileContent, {decodeEntities: false});
		var mainStyle = $('link[href$="style.css"]')
		mainStyle.remove();

		var styleLabel = '<link rel="stylesheet" href="' + data.requireJsBaseUrl + styleMd5Path + '" />'
		$('head').append(styleLabel);

		var mainScript = $('script[src$="require.js"]');
		mainScript.remove();
		var scriptLabel = '<script type="text/javascript" data-main="' + data.requireJsBaseUrl + mainJsMd5Path + '" src="' + data.requireJsBaseUrl + requireJsMd5Path + '.js"></script>'
		$('body').append(scriptLabel);
		return $.html();
	}

	/**
	 * 根据文件内容返回md5值
	 * @param  {[type]} fileContent [description]
	 * @return {[type]}             [description]
	 */
	function md5File(fileContent){
		var md5sum = crypto.createHash('md5');
        md5sum.update(fileContent, 'utf_8');
        return md5sum.digest('hex').substring(0, 8); //截取8个字符作为文件名
	}


	/**
	 * 生成开发环境的main.js的文件
	 * @param  {[type]} data           [description]
	 * @param  {[type]} mapFileName    [description]
	 * @param  {[type]} md5MapFileName [description]
	 * @return {[type]}                [description]
	 */
	function generateMainJsDev(data, mapFileName, md5MapFileName){
		var mainJsPath = data.basePath + data.mainJs;
		var requireJsBaseUrl = data.requireJsBaseUrl;

		var fileContent = grunt.file.read(mainJsPath);

		fileContent = fileContent.replace(/.*baseUrl.*,/gi, 'baseUrl:"' + requireJsBaseUrl + '",');

		grunt.log.ok('生成的开发环境main.js文件:' + mainJsPath);
		grunt.file.write(mainJsPath, fileContent);
	}

	grunt.registerMultiTask('release', '美丽范H5发布插件', function() {
		var data = this.data;
		if(this.nameArgs == 'release:test'){
			grunt.log.ok('执行美丽范H5发布插件调试任务');
			var configs = readConfigFile(data);
			generateMd5File(configs, data);
			generateHomePage(data);
		} else if(this.nameArgs == 'release:publish'){
			grunt.log.ok('执行美丽范H5发布插件生产环境任务');
			var configs = readConfigFile(data);
			generateMd5File(configs, data);
			generateHomePage(data);
		} else {
			grunt.log.ok('执行美丽范H5发布插件开发环境任务');
			grunt.log.ok('将' + data.configPath + '内容复制到' + data.mapPath + '中');
			var content = grunt.file.read(data.basePath + data.configPath);
			grunt.file.write(data.basePath + data.mapPath, content);
			generateMainJsDev(data);

			grunt.log.ok('复制完成');
		}
	});	
		
	/* function generateMd5File(assetName, md5){
	}
	
	function getNewAssetsUrl(assetName, md5) {
        md5=md5.substring(0,8);
        var newurl='';
        if(assetName.indexOf('?t=')>=0){
            newurl = assetName.substring(0,assetName.length_8) + md5;
        }else{
            newurl = assetName + '?t=' + md5;
        }
        return newurl;
    }

    function replaceAssets(fileSrc, assetUrl) {
        if (grunt.file.exists(fileSrc)) {
            var data = grunt.file.read(fileSrc);

            var replaceUrl = assetUrl.replaceUrl;

            var path = assetUrl.path;

            var assetData = grunt.file.read(path);


            replaceUrl = replaceUrl.substring(replaceUrl.lastIndexOf('/'),replaceUrl.length);

            if (data.indexOf(replaceUrl) >= 0) {
                var md5sum = crypto.createHash('md5');
                md5sum.update(assetData, 'utf_8');
                var reg = new RegExp('".*' + replaceUrl + '.*"','g');
                var fullAssetUrl = reg.exec(data).toString();
                var assetName = fullAssetUrl.substring(fullAssetUrl.indexOf(replaceUrl),fullAssetUrl.length_1);
                var md5 = md5sum.digest('hex');
                var newurl = getNewAssetsUrl(assetName, md5);
                var newdata = data.replace(assetName, newurl);
                if (grunt.file.write(fileSrc, newdata)) {
                    grunt.log.success(replaceUrl + ' 添加md5: ' + md5 + ' 成功');
                } else {
                    grunt.log.error(replaceUrl + ' 添加md5失败');
                }
            } else {
                grunt.log.error('没有发现要替换的内容 ' + fileSrc);
            }
        }
    }

    grunt.registerMultiTask('cache', 'The best Grunt plugin ever.', function() {
        var options = this.options({

        });

        var assetUrl = this.data.assetUrl;
        this.files.forEach(function(f) {
            var src = f.src.filter(function(filepath) {
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('源文件 "' + filepath + '" 没有找到.');
                    return false;
                } else {
                    grunt.log.success('源文件 "' + filepath + '" 发现.');
                    for(var i= 0,len=assetUrl.length;i<len;i++){
                        var url = assetUrl[i];
                        replaceAssets(filepath, url);
                    }
                    return true;
                }
            });
        });
    }); */
};
