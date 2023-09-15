Page({

  /**
   * 页面的初始数据
   */
  data: {
    tapTime: new Date(),
    entryInfos: [{
        icon: '../../resource/interactionLive.png',
        subtitle: '《基础推拉流1v1》',
        title: '视频直播',
        navigateTo: '../base/index'
      },
      {
        icon: '../../resource/interactionLive.png',
        subtitle: '《实时消息》',
        title: '视频直播',
        navigateTo: '../message/index'
      },
      {
        icon: '../../resource/interactionLive.png',
        subtitle: 'token v3',
        title: 'token鉴权',
        navigateTo: '../tokenRole/index'
      },
      {
        icon: "../../resource/setting.png",
        subtitle: '设置APPID',
        title: "自定义设置",
        navigateTo: "../setting/index"
      },
    ]
  },
  downloadBundle() {
    my.call("prepareRTCResource", {}, function (result) {
      //result.success == true 的时候说明依赖包准备完成，可以进行视频通话操作，否则提示error
      my.showToast({
        type: result.success ? "success" : "fail",
        content: JSON.stringify(result)
      })
    });
  },

  onEntryTap(e) {
    // if(1) {
    // 防止两次点击操作间隔太快
    let nowTime = new Date();
    if (nowTime.getTime() - new Date(this.data.tapTime).getTime() < 1000) {
      return;
    }
    let toUrl = this.data.entryInfos[e.currentTarget.id].navigateTo;
    console.log(toUrl);
    my.navigateTo({
      url: toUrl,
    });
    this.setData({
      'tapTime': nowTime
    });

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    console.log('onReady');
  },

});