import {
  ZegoExpressEngine
} from "../../libs/ZegoExpressMiniProgram";
const zg = new ZegoExpressEngine(1739272706, 'wss://webliveroom1739272706-api.zego.im/ws')
Page({
  data: {
    rtcroom: {
      roomId: "",
      token: "",
      userId: "1234567889889829",
      signature: "q11WQ1Bln/Jzs7zkVGkGC7nFHyqqbwEiEufjNztewQzVEbNPMxMF7l2bMBFdTD37mqkS2cu6z+KZ3/z3q4+YpDwxYlTnv2GDYWuPwww/A+ayVxpb+z06Dpbh2pesZDRu5kCZbT68lZ/J7WHzBzSMWOj2b9KS/Xywa0+JFgI4TMm8fn6OKBGRJWoifQxKGO/SM0F5q1TSFifkChyZ1lQZUnnfe79khklu6oBbLI8CaanY6Bi3Dyj+iHn4/jo9K4bRbsmwZS+wh0FkDWADsc7jencwlZGgeLqB7R6UDg84lq83m5wKkJBrVwJtMlljj1oo3G3o41VpxqBKLvOq7OZf/A==",
      autoplay: true,
      enableCamera: true,
      resolution: 1,
      fps: 30,
      record: false,
      minBitrate: "",
      maxBitrate: "",
      extraInfo: {
        "bizName": "zego_test",
        "subBiz": "N",
        "isAliPay": true,
        rtmpPushUrl: "",
        serverUrl: "wss://artvcroomdev.dl.alipaydev.com/ws",
        rtmpPullUrl: ""
      },
      mute: true,
    },
    pushStreamID: '123_test',
    pullStreamID: '',
    roomID: "456",
    isLogin: false,
  },

  async onShow() {
    const _this = this;
    const result = await zg.checkSystemRequirements();
    console.log("checkSystemRequirements", result);
    zg.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
      console.warn(state, roomID);
    })
    zg.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
      console.error("roomStreamUpdate", roomID, updateType, streamList);
      const rtcroom = _this.data.rtcroom;
      if (updateType === "ADD") {
        if (!rtcroom.extraInfo.rtmpPullUrl) {
          const pullStreamID = streamList[0].streamID;
          const {
            url
          } = await zg.startPlayingStream(streamList[0].streamID)
          rtcroom.extraInfo.rtmpPullUrl = url
          _this.setData({
            rtcroom: rtcroom,
            isShow: true,
            pullStreamID: pullStreamID
          })
          setTimeout(() => {
            console.warn(_this.data.rtcroom.extraInfo)
          }, 200);
        }
      } else {
        streamList.forEach(i => {
          zg.stopPlayingStream(i.streamID);
          _this.setData({
            isShow: false
          })
        })
      }
    });
    // 推流后，服务器主动推过来的，流状态更新
    // NO_PUBLISH：未推流状态，PUBLISH_REQUESTING：正在请求推流状态，PUBLISHING：正在推流状态
    // state: "PUBLISHING" | "NO_PUBLISH" | "PUBLISH_REQUESTING";
    zg.on("publisherStateUpdate", (result) => {
      console.warn("publishStateUpdate", result.state);
      if (result.state === "NO_PUBLISH") {
        this.data.rtcroom.extraInfo.rtmpPullUrl = ""
        this.setData({
          rtcroom: this.data.rtcroom
        })
      }
    });
    zg.on("playerStateUpdate", (result) => {
      console.warn("playerStateUpdate", result.state);
      if (result.state === "NO_PLAY") {
        this.data.rtcroom.extraInfo.rtmpPushUrl = ""
        this.setData({
          rtcroom: this.data.rtcroom
        })
      }
    });
  },

  //事件
  onError(e) {
    console.log("onError, e=" + JSON.stringify(e));
    my.alert({
      content: 'onError: ' + JSON.stringify(e)
    });
    this.setData({
      error: e.detail.error,
      errormsg: e.detail.errorMessage,
    });
  },

  onRoomInfo(e) {
    console.log("onRoomInfo, e=" + JSON.stringify(e));
    my.alert({
      content: 'onRoomInfo: ' + JSON.stringify(e)
    });
    this.setData({
      roomId: e.detail.roomId,
      token: e.detail.token,
    });
  },


  onParticipantEnter(e) {
    my.alert({
      content: 'onParticipantEnter: ' + JSON.stringify(e)
    });
  },

  onParticipantLeave(e) {
    my.alert({
      content: 'onParticipantLeave: ' + JSON.stringify(e)
    });
  },

  onAudioPlayoutMode(e) {
    my.alert({
      content: 'onAudioPlayoutMode: ' + JSON.stringify(e)
    });
  },


  onReceiveRecordId(e) {
    my.alert({
      content: 'onReceiveRecordId: ' + JSON.stringify(e)
    });
  },

  onFirstRender(e) {
    my.alert({
      content: 'onFirstRender: ' + JSON.stringify(e)
    });
  },

  onRenderStop(e) {
    my.alert({
      content: 'onRenderStop: ' + JSON.stringify(e)
    });
  },
  onRtmpEvent(e) {
    if ([3800, 3801].includes(e.detail.code)) {
      zg.updatePlayerState(this.data.pushStreamID, e);
    } else if ([3802, 3803].includes(e.detail.code)) {
      zg.updatePlayerState(this.data.pullStreamID, e);
    }
    my.alert({
      content: 'onRenderStop: ' + JSON.stringify(e)
    });
  },
  onBlur(e) {
    this.setData({
      roomID: e.detail.value
    })
  },
  handleRoom() {
    if (this.data.isLogin) {
      this.logoutRoom();
    } else {
      this.loginRoom();
    }
    this.setData({
      isLogin: !this.data.isLogin
    })
  },
  async loginRoom() {
    // 登录房间，成功则返回 true
    const token = "04AAAAAGThWQwAEDEzNWNoc2tsZ3c3Mnl5N2wA0Hx8cyUQypG7AzuTYBCsgINOSNwpnyceqbwBGiLx+IR1Ga2LKuFvf9msBnWd4CF5542xm/MTymbkAKImlQ0oSHUv1qYVINsnrHOalDhluPWYJg0HTc1wd+mgqNL+RKY2orbRPzUhJep57N8qywTQ97XQBna8h6ogx95s8tsk7v3x1QgTtii55uiK8cjsZ5YQUHnpGmVfjplpouxfTo6nYhLgAFLQBlzrqfWJrGTt4A/HwpewG6l8by0WzfPkfVKNVJOZCLbU8BNqz6lQ+JrW6Q0=";
    const result = await zg.loginRoom(this.data.roomID, token, {
      userID: "sample1692103573955", // userID，需用户自己定义，保证全局唯一，建议设置为业务系统中的用户唯一标识
      userName: "sample1692103573955" // userName 用户名
    }, {
      userUpdate: true // 是否接收用户进出房间的回调，设置为 true 才能接收到房间内其他用户进出房间的回调
    });
    if (result) {
      const {
        url
      } = await zg.startPublishingStream(this.data.pushStreamID);
      const rtcroom = this.data.rtcroom;
      rtcroom.extraInfo.rtmpPushUrl = url
      this.setData({
        rtcroom: rtcroom
      })
    }
  },
  logoutRoom() {
    zg.logoutRoom(this.data.roomID);
    const rtcroom = this.data.rtcroom;
    rtcroom.extraInfo.rtmpPushUrl && zg.stopPublishingStream(this.data.pushStreamID);
    rtcroom.extraInfo.rtmpPullUrl && zg.stopPlayingStream(this.data.pullStreamID)
    rtcroom.extraInfo.rtmpPushUrl = ""
    rtcroom.extraInfo.rtmpPullUrl = ""
    this.setData({
      rtcroom: rtcroom
    })
  }
});