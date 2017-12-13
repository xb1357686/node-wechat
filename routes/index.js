var express = require('express');
var crypto = require('crypto');
var router = express.Router();
var token = "allinfun";
//xml格式的转换
var xml2js = require('xml2js'); //xml转json
var builder = new xml2js.Builder(); //JSON转xml
var parser = new xml2js.Parser();
var AccessToken = {
    grant_type: 'client_credential',
    appid: 'XXXXXXXXXXXXXXXXXXXXXX',
    secret: 'XXXXXXXXXXXXXXXXXXXXX'
};
var API = require('co-wechat-api');
var api = new API(AccessToken.appid, AccessToken.secret);
/* GET home page. */
router.get('/', function (req, res, next) {
    var signature = req.query.signature;
    var timestamp = req.query.timestamp;
    var nonce = req.query.nonce;
    var echostr = req.query.echostr;
  
    /*  加密/校验流程如下： */
    //1. 将token、timestamp、nonce三个参数进行字典序排序
    var array = new Array(token,timestamp,nonce);
    array.sort();
    var str = array.toString().replace(/,/g,"");
  
    //2. 将三个参数字符串拼接成一个字符串进行sha1加密
    var sha1Code = crypto.createHash("sha1");
    var code = sha1Code.update(str,'utf-8').digest("hex");
  
    //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    if(code===signature){
        res.send(echostr)
    }else{
        res.send("error");
    }
});

//微信客户端各类回调用接口
var EventFunction = {
    //关注
    subscribe: function (result, req, res) {
        //存入openid 通过微信的接口获取用户的信息同时存入数据库。
        let openID = result.xml.FromUserName;
        async function getUser() {
            let result = await api.getUser({
                openid: openID,
                lang: 'en'
            });
            console.log("result :" + JSON.stringify(result));
        };
        getUser();
    },
    //注销
    unsubscribe: function (openid, req, res) {
        //删除对应id
    },
    //打开某个网页
    VIEW: function () {
        //根据需求，处理不同的业务
    },
    //自动回复
    responseNews: function (body, res) {
        function autoResponse(txt) {
            var xml = {
                xml: {
                    ToUserName: body.FromUserName,
                    FromUserName: body.ToUserName,
                    CreateTime: +new Date(),
                    MsgType: 'text',
                    Content: txt
                }
            };
            var reciviMessage = body.Content;
            if (/^\@.*/.test(reciviMessage)) {
                xml.xml.Content = '已经收到您的建议，会及时处理！'
            }
            //将json转为xml
            xml = builder.buildObject(xml);
            res.send(xml);
        }
        autoResponse('哈哈哈哈，已笑疯');

    },
    SCAN: function (body, res) {
        //关注后返回的消息
        var xml = {
            xml: {
                ToUserName: body.FromUserName,
                FromUserName: body.ToUserName,
                CreateTime: +new Date(),
                MsgType: 'text',
                Content: '欢迎关注'
            }
        };
        var reciviMessage = body.Content;
        if (/^\@.*/.test(reciviMessage)) {
            xml.xml.Content = '已经收到您的建议，会及时处理！'
        }
        //将json转为xml
        xml = builder.buildObject(xml);
        //发送给微信
        res.send(xml);
    }
};

//获取事件推送；
router.post('/', function (req, res, next) {
    //获取参数
    var query = req.query;
    //签名
    var signature = query.signature;
    //输出的字符，你填写的TOKEN 
    var echostr = query.echostr;
    //时间戳
    var timestamp = query.timestamp;
    //随机字符串
    var nonce = query.nonce;
    //获取xml数据
    req.on("data", function (data) {
        //将xml解析
        parser.parseString(data.toString(), function (err, result) {
            var body = result.xml;
            var messageType = body.MsgType;
            //用户点击菜单响应事件
            if (messageType == 'event') { //关注成功后的推送
                var eventName = body.Event;
                EventFunction.subscribe(result, req, res); //处理用户openID；
                EventFunction.SCAN(body, res);
                //自动回复消息
            } else if (messageType == 'text') {
                EventFunction.responseNews(body, res);
                //第一次填写URL时确认接口是否有效
            } else {
                res.send('网络繁忙哦，请稍后再试');
            }
        });
    });
})

router.post('/user/qrcode', (req, res) => { //生成带参数的二维码
    async function getQRCode() {
        var result = await api.createTmpQRCode('123456', 1800);
        res.json({
            'data': result
        })
    };
    getQRCode();
})

module.exports = router;