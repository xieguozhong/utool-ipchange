const { exec } = require("child_process");

//统一的公共shell执行函数
function pubcomm_exec_promise(stringShell) {
  console.log("执行命令：" + stringShell);
  return new Promise((resolve, reject) => {
    exec(stringShell, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

window.services = {};

(function () {
  if (utools.isMacOS()) {
    //1 MacOS 下获取网卡名称列表
    window.services.getNetworkNameList = () => {
      const shell = "networksetup -listallhardwareports";
      return pubcomm_exec_promise(shell);
    };

    //2 MacOS 下根据网卡名称获取网卡的信息
    window.services.getNetworkInfo = (hardwarePortName) => {
      const shell = `networksetup -getinfo "${hardwarePortName}"`;
      return pubcomm_exec_promise(shell);
    };

    //3 Macos 下把某个网卡设置为DHCP自动获取
    window.services.setNetworkToDHCP = (hardwarePortName) => {
      const shell = `networksetup -setdhcp "${hardwarePortName}"`;
      return pubcomm_exec_promise(shell);
    };

    //4 Macos 下把某个网卡设置为DHCP自动获取
    window.services.setNetworkToManual = (hardwarePortName, shellInfo) => {
      if (shellInfo.method === "setmanual") {
        const shell = `networksetup -setmanual "${hardwarePortName}" ${shellInfo.addressInfo}`;
        return pubcomm_exec_promise(shell);
      } else if (shellInfo.method === "setmanualwithdhcprouter") {
        const shell = `networksetup -setmanualwithdhcprouter "${hardwarePortName}" ${shellInfo.addressInfo}`;
        return pubcomm_exec_promise(shell);
      } else if(shellInfo.method ==='setmanualNorouter') {
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
  } else if (utools.isWindows()) {
    //1 Windows 下获取网卡名称列表
    window.services.getNetworkNameList = () => {
      const shell = "chcp 65001 && netsh interface show interface";
      return pubcomm_exec_promise(shell);
    };

    //2 Windows 下根据网卡名称获取网卡的信息
    window.services.getNetworkInfo = (hardwarePortName) => {
      const shell = `chcp 65001 && netsh interface ip show address "${hardwarePortName}"`;
      return pubcomm_exec_promise(shell);
    };

    //3 Windows 下把某个网卡设置为DHCP自动获取
    window.services.setNetworkToDHCP = (hardwarePortName) => {
      const shell = `netsh interface ip set address "${hardwarePortName}" dhcp`;
      return pubcomm_exec_promise(shell);
    };

    //4 Windows 下把某个网卡设置为DHCP自动获取
    window.services.setNetworkToManual = (hardwarePortName, shellInfo) => {
      const shell = `netsh interface ip set address "${hardwarePortName}" static ${shellInfo.addressInfo}`;
      return pubcomm_exec_promise(shell);
    };
  }
})();
