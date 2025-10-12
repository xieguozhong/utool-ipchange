
(function () {
  const { exec } = require("child_process");

  //统一的公共shell执行函数
  function pubcomm_exec_promise(stringShell) {
    console.log("执行命令：" + stringShell);
    return new Promise((resolve, reject) => {
      try {
        exec(stringShell, (error, stdout) => {
          if (error) {
            reject(error); // 捕获到错误，执行 reject
          } else {
            resolve(stdout); // 执行成功，返回标准输出
          }
        });
      } catch (err) {
        console.error("执行命令时发生异常：", err);
        reject(err); // 捕获 exec 之外的错误
      }
    });
  }

  //统一的公共shell执行函数(以管理员身份执行)
  function pubcomm_exec_promise_admin(stringShell) {
    const sudo = require("./public/sudo-prompt");
    console.log("管理员执行命令：" + stringShell);
    return new Promise((resolve, reject) => {
      try {
        sudo.exec(
          stringShell,
          { name: "utools ipchange" },
          (error, stdout) => {
            if (error) {
              reject(error);
            } else {
              resolve(stdout);
            }
          }
        );
      } catch (err) {
        console.error("管理员执行命令时发生异常：", err);
        reject(err); // 捕获 exec 之外的错误
      }
    });
  };

  window.ipchangServices = {};


  if (utools.isMacOS()) {

    //1 MacOS 下获取网卡名称列表
    window.ipchangServices.getNetworkNameList = () => {
      const shell = "networksetup -listallhardwareports";
      return pubcomm_exec_promise(shell);
    };

    //2 MacOS 下根据网卡名称获取网卡的信息
    window.ipchangServices.getNetworkInfo = (hardwarePortName) => {
      const shell = `networksetup -getinfo "${hardwarePortName}"`;
      return pubcomm_exec_promise(shell);
    };

    //3 Macos 下把某个网卡设置为DHCP自动获取
    window.ipchangServices.setNetworkToDHCP = (hardwarePortName) => {
      const shell = `networksetup -setdhcp "${hardwarePortName}"`;
      return pubcomm_exec_promise(shell);
    };

    //4 Macos 下把某个网卡设置为手动
    window.ipchangServices.setNetworkToManual = (hardwarePortName, shellInfo) => {
      if (shellInfo.method === "setmanual") {
        const shell = `networksetup -setmanual "${hardwarePortName}" ${shellInfo.addressInfo}`;
        return pubcomm_exec_promise(shell);
      }

      if (shellInfo.method === "setmanualwithdhcprouter") {
        const shell = `networksetup -setmanualwithdhcprouter "${hardwarePortName}" ${shellInfo.addressInfo}`;
        return pubcomm_exec_promise(shell);
      }

      if (shellInfo.method === 'setmanualNorouter') {
        //这一步为了清空网关项的旧值
        const shell = `networksetup -setmanualwithdhcprouter "${hardwarePortName}" ${shellInfo.addressInfo.split(' ')[0]}`;
        return pubcomm_exec_promise(shell).then(
          function (res) {
            const shell = `networksetup -setmanual "${hardwarePortName}" ${shellInfo.addressInfo}`;
            return pubcomm_exec_promise(shell);
          },
          function (error) {
            console.log("出错了：" + error);
          }
        );
      }
    };

    //5 Macos 下获取网卡的 dns 信息 使用 networksetup -getdnsservers命令
    window.ipchangServices.getDnsInfos = (hardwarePortName) => {
      const shell = `networksetup -getdnsservers "${hardwarePortName}"`;
      return pubcomm_exec_promise(shell);
    };

    //6 Macos 下获取网卡的 dns 信息(从/etc/resolv.conf 文件中读取)
    window.ipchangServices.getDnsFromResolv = () => {
      const shell = `cat /etc/resolv.conf |grep nameserver`;
      return pubcomm_exec_promise(shell);
    };

    //7 Macos 下设置网卡的 dns 信息
    window.ipchangServices.setDnsInfo = async (hardwarePortName, dnsInfo) => {
      const shell = `networksetup -setdnsservers "${hardwarePortName}" ${dnsInfo}`;
      await pubcomm_exec_promise(shell);

      //清空 DNS 缓存
      return pubcomm_exec_promise(`dscacheutil -flushcache`);
    };

  } else if (utools.isWindows()) {

    //设置widnows下当前用户是否为管理员
    window.ipchangServices.isAdmin = false;


    //1 Windows 下获取网卡名称列表
    window.ipchangServices.getNetworkNameList = () => {
      const shell = "chcp 65001 && netsh interface show interface";
      return pubcomm_exec_promise(shell);
    };

    //2 Windows 下根据网卡名称获取网卡的信息
    window.ipchangServices.getNetworkInfo = (cardName) => {
      const shell = `chcp 65001 && netsh interface ip show config name="${cardName}"`;
      return pubcomm_exec_promise(shell);
    };

    //3 Windows 下把某个网卡设置为DHCP自动获取
    window.ipchangServices.setNetworkToDHCP = (hardwarePortName) => {
      const shell = `netsh interface ip set dns name="${hardwarePortName}" source=dhcp && netsh interface ip set address "${hardwarePortName}" dhcp && ipconfig /flushdns`;
      return pubcomm_exec_promise_admin(shell);
    };

    //4 Windows 下把某个网卡设置为手动ip
    window.ipchangServices.setNetworkToManual = (dnsshell, hardwarePortName, shellInfo) => {
      const shell = `${dnsshell} && netsh interface ip set address "${hardwarePortName}" static ${shellInfo.addressInfo} && ipconfig /flushdns`;
      return pubcomm_exec_promise_admin(shell);
    };

  }
})();
