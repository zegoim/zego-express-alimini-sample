import {
  getTokenAndUserID
} from '../../utils/server';
import {
  initSDK,
  authCheck,
  startPush,
  republish
} from '../../utils/common';
// let ZegoExpressEngine = require("zego-express-engine-miniprogram").ZegoExpressEngine; // 以 npm 的方式引用
let {
  zegoAppID,
  server,
  signature,
  serverUrl,
  bizName,
  subBiz
} = getApp().globalData;
// import {
//         ZegoExpressEngine
// } from '../../libs/ZegoExpressMiniProgram';
let zg;
let last = Date.now()
Page({
  data: {
    rtcroomID: "rtcroom-" + Date.now(),
    rtcroom: {
      roomId: "",
      token: "",
      userId: "1234567889889829",
      signature: signature,
      autoplay: true,
      enableCamera: false,
      resolution: 1,
      fps: 30,
      record: false,
      minBitrate: "",
      maxBitrate: "",
      extraInfo: {
        "bizName": bizName,
        "subBiz": subBiz,
        "isAliPay": true,
        rtmpPushUrl: "",
        serverUrl: serverUrl,
        rtmpPullUrl: ""
      },
      mute: false,
    },
    roomID: '', // 房间ID
    token: '', // 服务端校验token
    pullStreamID: '',
    pushStreamID: 'xcx-streamID-' + new Date().getTime(), // 推流ID
    userID: '', // 用户ID,
    connectType: -1, // -1为初始状态，1为连接，0断开连接
    canShow: -1,
    role: '',
    roomUserList: [],
    handupStop: false,
    isRelogin: false,
    needRepublish: false,
    showRtcroom: false,
    isStart: true,
    pullList: [],
    showCamera: true,
    rtcroomContext: null,
    isIOS: false
  },
  keyInput(e) {
    this.setData({
      roomID: e.detail.value
    });
  },
  openRoom2() {
    this.openRoom("0")
  },
  async openRoom(role) {
    role = role == "0" ? "0" : "1";
    if (!this.data.roomID) {
      my.alert({
        title: '提示',
        content: '请输入房间号'
      });
      return;
    }
    this.setData({
      role: role
    })
    if (this.data.connectType !== 1) {
      try {
        /** 获取token, userID */
        const res = getTokenAndUserID();
        if (!res) {
          console.error("userID and Token haven't been set.")
          return;
        }
        this.setData({
          token: res.token,
          userID: res.userID
        });
        /** 开始登录房间 */
        let isLogin = await zg.loginRoom(this.data.roomID, this.data.token, {
          userID: this.data.userID,
          userName: 'nick' + this.data.userID
        }, {
          userUpdate: true
        });
        isLogin ? console.log('login success') : console.error('login fail');

        this.setData({
          connectType: 1,
          isRelogin: true
        });
      } catch (error) {
        console.error('error: ', error);
        return;
      }
    }
    // 创建房间，开始推流
    if (role == 1 && this.data.rtcroom.extraInfo.rtmpPullUrl === '') {
      startPush(this);
    }

  },
  logout() {
    try {
      const rtcroom = this.data.rtcroom;
      const pushStreamID = this.data.pushStreamID;
      const pullStreamID = this.data.pullStreamID;
      if (rtcroom.extraInfo.rtmpPushUrl) {
        zg.stopPublishingStream(pushStreamID);
        rtcroom.extraInfo.rtmpPushUrl = ""
      }
      if (rtcroom.extraInfo.rtmpPullUrl) {
        zg.stopPlayingStream(pullStreamID);
        rtcroom.extraInfo.rtmpPullUrl = ""
      }
      rtcroom.enableCamera = false
      this.setData({
        rtcroom: rtcroom,
        pullStreamID: "",
        showRtcroom: false
      })
      /** 登出房间 */
      if (zg && this.data.connectType === 1) zg.logoutRoom(this.data.roomID);
    } catch (error) {
      console.error('error: ', error);
    }
  },
  onError(e) {
    console.error("onError, e=" + JSON.stringify(e));
  },

  onRoomInfo(e) {
    console.warn("onRoomInfo, e=" + JSON.stringify(e));
  },

  onParticipantEnter(e) {
    console.warn("onParticipantEnter, e=" + JSON.stringify(e));
  },

  onParticipantLeave(e) {
    console.warn("onParticipantLeave, e=" + JSON.stringify(e));
  },

  onAudioPlayoutMode(e) {
    console.warn("onAudioPlayoutMode, e=" + JSON.stringify(e));
  },


  onReceiveRecordId(e) {
    console.warn("onReceiveRecordId, e=" + JSON.stringify(e));
  },

  onFirstRender(e) {
    console.warn("onFirstRender, e=" + JSON.stringify(e));
  },

  onRenderStop(e) {
    console.warn("onRenderStop, e=" + JSON.stringify(e));
  },
  // 更新推拉流状态
  onRtmpEvent(e) {
    console.warn("onRtmpEvent, e=" + JSON.stringify(e));
    if ([3800, 3801].includes(e.detail.code)) {
      // 推流
      zg.updatePlayerState(this.data.pushStreamID, e);
    } else if ([3802, 3803].includes(e.detail.code)) {
      // 拉流
      zg.updatePlayerState(this.data.pullStreamID, e);
    }
  },

  publishStream() {
    startPush(this);
    setTimeout(() => {
      authCheck(this);
    }, 1000)
  },

  handleShowrtcRoom() {
    const extraInfo = this.data.rtcroom.extraInfo
    const isShow = Boolean(extraInfo.rtmpPullUrl || extraInfo.rtmpPushUrl);
    this.setData({
      showRtcroom: false
    }, () => {
      this.data.rtcroomContext && this.data.rtcroomContext.stop();
      const id = "rtcroom-" + Date.now()
      this.setData({
        rtcroomID: id,
        showRtcroom: isShow,
        rtcroomContext: my.createRtcRoomContext(id)
      }, () => {
        // this.data.rtcroomContext.start();
      })

    })
    console.error(this.data.rtcroomID)
  },
  // 停止推流
  stopPushStream() {
    zg.stopPublishingStream(this.data.pushStreamID);
    this.data.rtcroom.extraInfo.rtmpPushUrl = ""
    this.setData({
      rtcroom: this.data.rtcroom,
    });
    this.handleShowrtcRoom()
  },
  //停止拉流
  stopPullStream() {
    const streamID = this.data.pullStreamID
    streamID && zg.stopPlayingStream(streamID);
    this.data.rtcroom.extraInfo.rtmpPullUrl = ""
    this.setData({
      pullStreamID: "",
      rtcroom: this.data.rtcroom
    });
    this.handleShowrtcRoom()
  },
  enableCamera() {
    const rtcroom = this.data.rtcroom;
    rtcroom.enableCamera = !rtcroom.enableCamera
    this.setData({
      rtcroom: rtcroom
    })
    this.data.isIOS && this.handleShowrtcRoom()
    this.data.rtcroomContext.enableCamera({
      enable: rtcroom.enableCamera
    });
  },
  enableMicrophone() {
    const rtcroom = this.data.rtcroom;
    rtcroom.mute = !rtcroom.mute
    this.setData({
      rtcroom: rtcroom,
    })
    this.data.isIOS && this.handleShowrtcRoom()
    this.data.rtcroomContext.mute({
      muted: rtcroom.mute
    });
  },
  //  //切换拉流
  async onReady() {
    console.log('onReady')
    zg = initSDK(this);
    if (zg) {
      console.log('sdk version: ', zg.getVersion());
    }
  },

  async reLogin() {
    try {
      await zg.logoutRoom();
      /** 获取token, userID */
      const res = getTokenAndUserID();
      if (!res) {
        console.error("userID and Token haven't been set.")
        return;
      }
      this.setData({
        token: res.token,
        userID: res.userID
      });
      console.error('login ', this.data.userID, this.data.token, this.data.roomID, zegoAppID);
      console.error("登录房间roomid：" + this.data.roomID)
      let isLogin = await zg.loginRoom(this.data.roomID, this.data.token, {
        userID: this.data.userID,
        userName: 'nick' + this.data.userID
      });
      isLogin ? console.log('login success') : console.error('login fail');
      this.setData({
        connectType: 1,
        isRelogin: true
      });
      console.warn('pushStream: ', this.data.pushStreamID, this.data.livePusherUrl, this.data.role);
      republish(this)
    } catch (error) {
      console.error('error: ', error);
    }
  },
  onShow() {
    console.log('onShow: ', this.data.handupStop, this.data.connectType, server);
    authCheck(this);
    // 刷新全局变量
    zegoAppID = getApp().globalData.zegoAppID;
    server = getApp().globalData.server;
    // const rtcroomContext = my.createRtcRoomContext(this.data.rtcroomID);
    // this.setData({
    //   rtcroomContext: rtcroomContext
    // })

  },
  onHide() {
    console.warn("onHide")
    // this.logout();
  },
  onUnload() {
    console.warn("unload")
    this.logout();
    my.offNetworkStatusChange()
  },
  onLoad() {
    // 监听网络状态
    this.onNetworkStatus()
  },
  bindaudiovolumenotify(e) {
    // console.log('===========')
    // console.error(e)
    // console.log(new Date())
  },
  onNetworkStatus() {

    my.onNetworkStatusChange(res => {
      console.warn("网络变化", res.isConnected, this.data.connectType === 1)
      if (res.isConnected) {
        this.handleShowrtcRoom()
        const time = (Date.now() - this.data.brokenTime) / 1000;
        this.setData({
          needRepublish: time < 300 && time > 85
        })
      } else {
        this.setData({
          brokenTime: Date.now()
        })
      }
      if (res.isConnected && this.data.connectType === 1 && zg) {
        console.warn('data', this.data);
        console.warn('roomID', this.data.roomID);
        this.reLogin();
      }
    })
  },
  openSetting() {
    my.openSetting({
      success: () => {},
      fail: () => {}
    })
  }
});