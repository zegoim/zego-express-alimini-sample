App({
  globalData: {
    // 联系支付宝 BD 申请获得bizName、 subBiz、serverUrl
    bizName: "",
    subBiz: "",
    serverUrl: "",
    signature: "",
       
    zegoAppID: , // 填写自己账号下的AppID
    server: '', // 填写自己账号下的server
    userID: "", // userID
    token: ""
  },
  onLaunch(options) {
    // 第一次打开
    // options.query == {number:1}
    console.info('App onLaunch');
    my.call("prepareRTCResource", {}, function (result) {
      console.error("prepareRTCResource", JSON.stringify(result))
      //result.success == true 的时候说明依赖包准备完成，可以进行视频通话操作，否则提示error
    });
  },
  onShow(options) {
    // 从后台被 scheme 重新打开
    // options.query == {number:1}
  },
});
