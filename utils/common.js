import {
  ZegoExpressEngine
} from '../libs/ZegoExpressMiniProgram';

const app = getApp();

let zg;

function handleShowRtcroom(context) {
  const extraInfo = context.data.rtcroom.extraInfo
  const isShow = Boolean(extraInfo.rtmpPullUrl || extraInfo.rtmpPushUrl);
  context.setData({
    showRtcroom: false,
  }, () => {
    context.data.rtcroomContext && context.data.rtcroomContext.stop();
    const id = "rtcroom-" + Date.now()
    context.setData({
      rtcroomID: id,
      showRtcroom: isShow,
      rtcroomContext: my.createRtcRoomContext(id)
    })
  })
}
export const initSDK = (context) => {
  if (!_checkParam(app.globalData.zegoAppID, app.globalData.server)) return false;
  /** 初始化SDK，userID 为用户自定义ID，全局唯一 */
  zg = new ZegoExpressEngine(app.globalData.zegoAppID, app.globalData.server);

  console.log('version', zg.getVersion());

  my.getSystemInfo({
    success: (res) => {
      context.setData({
        isIOS: res.platform.toLocaleLowerCase().indexOf("ios") !== -1
      })
      console.log(res);
    },
    fail: (err) => {
      console.log(err);
    }
  })

  authCheck(context);

  zg.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
    console.warn("roomStreamUpdate", roomID, updateType, streamList);
    const rtcroom = context.data.rtcroom;
    if (updateType === "ADD") {
      context.data.pullList.push(...streamList);
    } else {
      streamList.forEach(i => {
        if (context.data.pullStreamID === i.streamID) {
          // 停止拉流
          zg.stopPlayingStream(i.streamID);
          rtcroom.extraInfo.rtmpPullUrl = ""
          context.setData({
            rtcroom: rtcroom
          }, () => {
            handleShowRtcroom(context);
          })

        }
        const index = context.data.pullList.findIndex(item => item.streamID === i.streamID);
        if (index !== -1) {
          context.data.pullList.splice(index, 1);
        }
      })
    }

    if (!rtcroom.extraInfo.rtmpPullUrl && context.data.pullList.length) {
      const pullStreamID = context.data.pullList[0].streamID;
      try {
        // 开始拉流
        const {
          url
        } = await zg.startPlayingStream(context.data.pullList[0].streamID)
        rtcroom.extraInfo.rtmpPullUrl = url
        context.setData({
          pullStreamID: pullStreamID,
          rtcroom: rtcroom
        }, () => {
          handleShowRtcroom(context);
        })
      } catch (error) {
        console.error(error)
      }
    }
    context.setData({
      pullList: context.data.pullList
    })
  });


  // the event is triggered when one join or leave the room
  zg.on("roomUserUpdate", (roomID, updateType, userList) => {
    console.warn(
      "roomID: ",
      roomID,
      " updateType: ",
      updateType === "ADD" ? "join" : "leave",
      " userList: ",
      userList
    );
    let roomUserList = context.data.roomUserList;
    if (updateType === "DELETE") {
      userList.forEach((user) => {
        const i = roomUserList.findIndex((item) => item.userID === user.userID);
        roomUserList.splice(i, 1);
      });
    } else if (updateType === "ADD") {
      userList.forEach((user) => {
        if (user.userID !== context.data.userID) {
          roomUserList.push(user);
        }
      });
    }
    context.setData({
      roomUserList,
    });
  });
  zg.on("roomStateUpdate", async (roomID, state, errorCode, extendedData) => {
    console.warn("roomStateUpdate", roomID, state, errorCode, extendedData);
    context.setData({
      connectType: 0
    })
    const rtcroom = context.data.rtcroom;
    if (state === "DISCONNECTED") {
      const pullStreamID = context.data.pullStreamID;
      context.data.rtcroomContext && context.data.rtcroomContext.stop();
      // if (pullStreamID) {
      //   zg.stopPlayingStream(pullStreamID);
      // }
      rtcroom.extraInfo.rtmpPushUrl = ""
      rtcroom.extraInfo.rtmpPullUrl = ""
      rtcroom.enableCamera = false;

      context.setData({
        connectType: 0,
        pullStreamID: "",
        rtcroom: rtcroom,
        role: "0",
        pullList: []
      });
      setTimeout(()=>{
        context.setData({
          showRtcroom: false
        });
      }, 100)
    } else if (state === "CONNECTED") {
      if (!context.data.isRelogin) {
        if (rtcroom.extraInfo.rtmpPullUrl && context.data.role == 1) {
          if (context.data.needRepublish) {
            zg.stopPublishingStream(context.data.pushStreamID);
            republish(context)
          }
          handleShowRtcroom(context)
        }
      }
      context.setData({
        connectType: 1,
        isRelogin: false,
      });
    }
  });
  zg.on("publisherStateUpdate", (result) => {
    console.error("publishStateUpdate", result);
    if (result.state === "NO_PUBLISH") {
      context.data.rtcroom.enableCamera = false;
      context.data.rtcroom.mute = false;
      context.setData({
        rtcroom: context.data.rtcroom
      })
    }
  });
  zg.on("playerStateUpdate", async (result) => {
    console.warn("playStateUpdate", result);
  });
  zg.on("publishQualityUpdate", (streamID, publishStats) => {
    console.log("publishQualityUpdate", streamID, publishStats);
  });
  zg.on("playQualityUpdate", (streamID, playStats) => {
    console.log("playQualityUpdate", streamID, playStats);
  });
  zg.on("roomOnlineUserCountUpdate", (roomID, userCount) => {
    console.warn("roomOnlineUserCountUpdate", roomID, userCount)
  });
  zg.on("recvReliableMessage", (roomID, userCount, trans_type) => {
    console.error("recvReliableMessage", roomID, userCount, trans_type);
  });
  zg.on("tokenWillExpire", (roomID) => {
    console.error("tokenWillExpire", roomID);
  });

  return zg;
};

export async function startPush(context, publishOption) {
  try {
    /** 开始推流，返回推流地址 */
    const pushStreamID = context.data.pushStreamID;
    const {
      url
    } = await zg.startPublishingStream(pushStreamID, publishOption);
    const rtcroom = context.data.rtcroom;
    console.warn(`startPush 推流地址${url}，推流类型：${publishOption && publishOption.sourceType}`);
    rtcroom.extraInfo.rtmpPushUrl = url;
    rtcroom.enableCamera = true;
    context.setData({
      rtcroom: rtcroom,
      needRepublish: false
    }, () => {
      handleShowRtcroom(context)
    });
  } catch (error) {
    console.error("error", error);
  }
};

export const authCheck = async (context) => {
  if (!zg) return;
  const result = await zg.checkSystemRequirements();
  console.log("checkSystemRequirements", result);
  if (result.code === 10001) {
    console.log("result ", result.code);
    my.alert({
      title: "提示",
      content: "当前微信版本过低，无法使用该功能，请升级到最新微信版本后再试。",
    });
    context.setData({
      canShow: 0,
    });
  } else if (result.code === 10002) {
    console.log("result ", result.code);
    let hasCamera = false;
    let hasRecord = false;
    my.openSetting({
      success: function (res) {
        console.error(res);
      },
      fail: function (err) {
        console.error(err);
      }
    });

  } else {
    context.setData({
      canShow: 1,
    });
  }
};

export function republish(context) {
  if (context.data.role != 1) return
  context.data.timer && clearTimeout(context.data.timer);
  const timer = setTimeout(async () => {
    const rtcroom = context.data.rtcroom;
    clearTimeout(context.data.timer);
    const {
      url
    } = await zg.startPublishingStream(context.data.pushStreamID);
    rtcroom.extraInfo.rtmpPushUrl = url;
    rtcroom.enableCamera = true;
    context.setData({
      rtcroom: rtcroom,
      needRepublish: false
    }, () => {
      handleShowRtcroom(context)
    })
  }, 200);
  context.setData({
    timer: timer,
  })
}

export const _checkParam = (zegoAppID, server) => {
  if (!zegoAppID) {
    my.showToast({
      title: `请在app.js或在自定义设置中提供正确的zegoAppID`,
      icon: 'none',
      duration: 5000
    });
    console.error('未设置正确的zegoAppID');
    return false;
  }
  if (!server) {
    my.showToast({
      title: `请在app.js或在自定义设置中提供正确的server`,
      icon: 'none',
      duration: 5000
    });
    console.error('未设置正确的server');
    return false;
  }
  return true;
};