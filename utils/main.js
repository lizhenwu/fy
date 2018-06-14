const http = require('http');
const crypto = require('crypto');
const chalk = require('chalk');
const toString = Object.prototype.toString;
const ERRORS = require('./error');
const config = require('./config');
const { URLSearchParams } = require('url');

function md5(str) {
    let hash = crypto.createHash('md5');
    return hash.update(str).digest('hex');
}
function getProperty(obj,path) {
    if(toString.call(path) === '[object Array]') {
        for(let key of path) {
            if(obj[key] == null) return void 0;
            obj = obj[key];
        }
        return obj;
    } else {
        return obj[path];
    }
}
function err(str) {
    console.log(chalk`
        
        {bold.red ${str}}`)
}
function makeReq(q) {
    const params = Object.assign({
            from: 'auto',
            to: 'auto',
            salt: Math.random()*100,
            q
        }, config);
        
    params.sign = md5(params.appKey + params.q + params.salt + params.key);
    params.q = encodeURIComponent(params.q);
    
    const options = {
        hostname: 'openapi.youdao.com',
        path: `/api?${new URLSearchParams(params).toString()}`
    }
    const req =  http.request(options,res => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data',chunk => {
            data += chunk;
        })
        res.on('end',() => {
            data = JSON.parse(data);
            if(data.errorCode !== '0') {
                return err(ERRORS[data.errorCode] || '发生未知错误');
            }
            if(!data.basic) {
                return err('没查到，可能拼写有误');
            }
            console.log(chalk`
                {bold.yellow ${getProperty(data,'query')}}

                英: {bold.yellow [${getProperty(data,['basic','uk-phonetic'])}]}  美: {bold.yellow [${getProperty(data,['basic','us-phonetic'])}]}
                释义: {bold.green ${[...getProperty(data,['basic','explains'])]}}
            `)
        })
    })
    req.on('error', e => {
        let str;
        switch(e.code) {
            case 'ENOENT': str = '可能断网了吧...'; break;
            default: str = '发生了未知错误'
        }
        return err(str);
    });
    req.end();
}
module.exports = makeReq