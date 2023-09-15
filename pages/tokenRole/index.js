import {
  initSDK,
  authCheck,
  startPush,
  republish
} from '../../utils/common';

let {
  zegoAppID,
  server,
  token,
  userID,
  signature,
  serverUrl,
  bizName,
  subBiz
} = getApp().globalData;
let zg;

Page({
  data: {
    rtcroomID: "rtcroom-"+ Date.now(),
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
      mute: false,
      extraInfo: {
        "bizName": bizName,
        "subBiz": subBiz,
        "isAliPay": true,
        rtmpPushUrl: "",
        serverUrl: serverUrl,
        rtmpPullUrl: ""
      },
    },
    pullStreamID: '',
    pushStreamID: 'xcx-streamID-' + new Date().getTime(), // 推流ID
    roomID: '22wd', // 房间ID
    token: "", // 服务端校验token
    userID: userID, // 用户ID,
    connectType: -1, // -1为初始状态，1为连接，0断开连接
    canShow: -1,
    brokenTime: 0,
    needRepublish: false,
    role: '',
    roomUserList: [],
    num: 0,
    isRelogin: false,
    showRtcroom: false,
    pullList: []
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
      zg.updatePlayerState(this.data.pushStreamID, e);
    } else if ([3802, 3803].includes(e.detail.code)) {
      zg.updatePlayerState(this.data.pullStreamID, e);
    }
  },
  handleShowrtcRoom() {
    const extraInfo = this.data.rtcroom.extraInfo
    const isShow = Boolean(extraInfo.rtmpPullUrl || extraInfo.rtmpPushUrl);
    this.setData({
      showRtcroom: false
    }, () => {
      this.setData({
        rtcroomID: "rtcroom-"+ Date.now(),
        showRtcroom: isShow
      })
    })
    console.error(this.data.rtcroomID)
  },
  changeRoomid(e) {
    this.setData({
      roomID: e.detail.value
    });
  },
  changeUserid(e) {
    this.setData({
      userID: e.detail.value
    });
  },
  changeToken(e) {
    this.setData({
      token: e.detail.value
    });
  },
  async openRoom(e) {
    if (!this.data.roomID) {
      my.alert({
        title: '提示',
        content: '请输入房间号',
      });
      return;
    }
    if (!this.data.userID) {
      my.alert({
        title: '提示',
        content: '请输入用户ID',
      });
      return;
    }
    if (!this.data.token) {
      my.alert({
        title: '提示',
        content: '请输入token',
      });
      return;
    }
    if (this.data.connectType !== 1) {
      try {

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
          isRelogin: true,
        })
      } catch (error) {
        console.error('error: ', error);
        return;
      }
    }
    this.setData({
      role: e.target.dataset.role
    })
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
      console.error("stop push 2")
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

  //更新鉴权token
  renewToken() {
    zg.renewToken(this.data.token);
  },
  publishStream() {
    startPush(this);
    this.setData({
      role: 1
    })
  },
  async onReady() {
    console.log('onReady')
    zg = initSDK(this);
    if (!zg) {
      return;
    }
    console.log('sdk version: ', zg.getVersion());

    // 覆盖全局回调, 只是为了特殊处理推流鉴权失败, 主动停止推流
    zg.off("publisherStateUpdate")
    zg.on("publisherStateUpdate", (result) => {
      console.error("publishStateUpdate", result);
      if (result.state === "NO_PUBLISH") {
        zg.stopPublishingStream(this.data.pushStreamID);
        this.data.rtcroom.extraInfo.rtmpPushUrl = ""
        this.setData({
          rtcroom: this.data.rtcroom,
        }, () => {
          this.handleShowrtcRoom();
        });
      }
    });
  },
  onNetworkStatus() {

    my.onNetworkStatusChange(res => {
      console.warn("网络变化", res.isConnected, this.data.connectType === 1)
      if (res.isConnected) {
        this.handleShowrtcRoom()
        const time = (Date.now() - this.data.brokenTime)/ 1000;
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

  async reLogin() {
    try {
      await zg.logoutRoom();
      let isLogin = await zg.loginRoom(this.data.roomID, this.data.token, {
        userID: this.data.userID,
        userName: 'nick' + this.data.userID
      });
      isLogin ? console.log('login success') : console.error('login fail');
      this.setData({
        connectType: 1,
        isRelogin: true
      });
      republish(this)
    } catch (error) {
      console.error('error: ', error);
    }
  },
  onShow() {
    authCheck(this);
    if (zg && this.data.roomID && this.data.token && this.data.userID) {
      this.reLogin();
    }
    let {
      token,
      userID,
    } = getApp().globalData;
    this.setData({
      userID: userID,
      token: token
    })

  },

  onHide() {
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
});