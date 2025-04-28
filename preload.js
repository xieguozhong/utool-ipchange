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

window.ipchangServices = {};

(function () {
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
    //1 Windows 下获取网卡名称列表
    window.ipchangServices.getNetworkNameList = () => {
      const shell = "chcp 65001 && netsh interface show interface";
      return pubcomm_exec_promise(shell);
    };

    //2 Windows 下根据网卡名称获取网卡的信息
    window.ipchangServices.getNetworkInfo = () => {
      const shell = `chcp 65001 && ipconfig /all`;
      return pubcomm_exec_promise(shell);
    };

    //3 Windows 下把某个网卡设置为DHCP自动获取
    window.ipchangServices.setNetworkToDHCP = (hardwarePortName) => {
      const shell = `netsh interface ip set address "${hardwarePortName}" dhcp`;
      return pubcomm_exec_promise(shell);
    };

    //4 Windows 下把某个网卡设置为手动
    window.ipchangServices.setNetworkToManual = (hardwarePortName, shellInfo) => {
      const shell = `netsh interface ip set address "${hardwarePortName}" static ${shellInfo.addressInfo}`;
      return pubcomm_exec_promise(shell);
    };

    // Windows 下设置某网卡的 DNS 信息 dnsInfo 为 Empty 表示清空 DNS 信息
    window.ipchangServices.setDnsInfo = (hardwarePortName, dnsInfo) => {
      let shell = '';
      //清空 DNS
      if(dnsInfo === 'Empty') {
        const shell = `netsh interface ip set dns name="${hardwarePortName}" source=dhcp && ipconfig /flushdns`;
        return pubcomm_exec_promise(shell);
      } else {
        const arraydns = dnsInfo.split(' ');      
        //设置首选 DNS
        if(arraydns[0]) {
          shell = `netsh interface ip set dns name="${hardwarePortName}" static ${arraydns[0]} primary`;
        }
        //设置备选 DNS
        if(arraydns[1]) {
          shell = shell + ` && netsh interface ip add dns name="${hardwarePortName}" ${arraydns[1]} index=2`;
        }
        //刷新 DNS 缓存
        shell = shell + " && ipconfig /flushdns"
      }
      
      return pubcomm_exec_promise(shell);
    }; 
  }
})();
