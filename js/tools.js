
(function () {
  if (utools.isMacOS()) {
    //1 MacOS 下解析获取网卡列表字符串
    IPTOOLS.parseNetworkNameList = function (result) {
      const res = result.split("\n");
      const networkNameList = [];
      for (let i = 0; i < res.length; i++) {
        if (
          res[i].includes("Ethernet Address") &&
          isValidMacAddress(res[i].substr(res[i].indexOf(":") + 2))
        ) {
          networkNameList.push(res[i - 2].substr(res[i - 2].indexOf(":") + 2));
        }
      }
      return networkNameList;
    };

    //2 MacOS 下解析某个网卡信息字符串
    IPTOOLS.parseNetworkInfos = function (networkcardInfo) {
      const res = networkcardInfo.split("\n");
      const cardInfos = [];
      for (let i = 0; i < res.length; i++) {
        if (res[i].indexOf("DHCP Configuration") === 0) {
          cardInfos[0] = "DHCP自动";
        } else if (res[i].indexOf("Manual Configuration") === 0) {
          cardInfos[0] = "手动设定";
        } else if (
          res[i].indexOf("Manually Using DHCP Router Configuration") === 0
        ) {
          cardInfos[0] = "DHCP手动";
        } else if (res[i].indexOf("IP address") === 0) {
          cardInfos[1] = res[i].substr(res[i].indexOf(":") + 2);
        } else if (res[i].indexOf("Subnet mask") === 0) {
          cardInfos[2] = res[i].substr(res[i].indexOf(":") + 2);
        } else if (res[i].indexOf("Router") === 0) {
          cardInfos[3] = res[i]
            .substr(res[i].indexOf(":") + 2)
            .replace("(null)", KONG);
        }
      }
      return cardInfos;
    };

    //3 MacOS 下解析手动设置网卡信息
    IPTOOLS.parseManualShell = function (networkcardInfo) {

      //ip 和 网关都填写了但没有填写掩码
      if (
        networkcardInfo.address.length > 0 &&
        networkcardInfo.subnetmask.length === 0 &&
        networkcardInfo.router.length > 0
      ) {
        alert("请输入子网掩码");
        setFocus('subnetmask');
        return { error: true };
      }


      //只填写了 ip 地址
      if (
        networkcardInfo.address.length > 0 &&
        networkcardInfo.subnetmask.length === 0 &&
        networkcardInfo.router.length === 0
      ) {
        //dhcp 手动设定  networksetup -setmanualwithdhcprouter "Ethernet" 192.168.1.100
        return {
          error: false,
          method: "setmanualwithdhcprouter",
          addressInfo: networkcardInfo.address,
        };
      }

      //填写了 ip 掩码
      if (
        networkcardInfo.address.length > 0 &&
        networkcardInfo.subnetmask.length > 0
      ) {
        //全部手动设定  setmanual
        let addressInfo =
          networkcardInfo.address + " " + networkcardInfo.subnetmask;
        if (networkcardInfo.router.length > 0) {
          addressInfo += " " + networkcardInfo.router;
          return { error: false, method: "setmanual", addressInfo: addressInfo };
        } else {
          return { error: false, method: "setmanualNorouter", addressInfo: addressInfo };
        }
      }
    };

    //Macos 下解析dns 信息
    IPTOOLS.parseDnsInfo = function (dnsinfo) {
      const dnsArray = dnsinfo.split('\n');
      const result = [];
      for(const it of dnsArray){
        if(isValidIP(it)) {
          result.push(it)
        }        
      }
      return result;
    }

    //Macos 下获取网卡的 ip和dns 信息的统一处理过程
    IPTOOLS.getParseIPandDnsInfo = async function (network_name) {
      //获取网卡 ip 信息
      const networkcardInfo = await window.ipchangServices.getNetworkInfo(network_name);
      const array_carInfo = IPTOOLS.parseNetworkInfos(networkcardInfo);

      //获取网卡的 dns 信息
      const dnsinfo = await window.ipchangServices.getDnsInfos(network_name);
      const dnsArray = IPTOOLS.parseDnsInfo(dnsinfo);

      //如果找不到网卡的 dns 信息, 就去找系统的 dns 信息
      if(dnsArray.length === 0) {
        const resolvdns = await window.ipchangServices.getDnsFromResolv();
        const resArray = resolvdns.split('\n');
        for(const it of resArray) {            
          const ns = it.split(' ')[1];
          if(ns && isValidIP(ns)) {
            dnsArray.push(ns);
          }
        }
      }
      array_carInfo[4] = dnsArray[0];
      array_carInfo[5] = dnsArray[1];
      return array_carInfo;
    }

  } else if (utools.isWindows()) {
    //1 Windows 下解析各个系统返回的获取网卡列表字符串
    IPTOOLS.parseNetworkNameList = function (result) {
      const res = result.replace(/\r/g, "").split("\n");
      const networkNameList = [];
      for (let i = 0; i < res.length; i++) {
        const arrayNK = res[i].split(/\s{2,}/);
        //只显示已经连接的网卡，对已断开连接的网卡进行设置有很多问题
        if (arrayNK[1] === "Connected") {
          networkNameList.push(arrayNK[3]);
        }
      }
      return networkNameList;
    };

    //2 Windows 下解析某个网卡信息字符串
    IPTOOLS.parseNetworkInfos = function (network_name, networkcardInfo) {
      const infos = [KONG,KONG,KONG,KONG,KONG,KONG];
      const arrayNetworkcardInfo = networkcardInfo.replace(/\r/g,"").split('\n');

      const starindex = arrayNetworkcardInfo.findIndex(item => typeof item === 'string' && item.includes(`adapter ${network_name}`));

      for(let i = starindex+1,len=arrayNetworkcardInfo.length;i<len;i++) {
        const it = arrayNetworkcardInfo[i].trim();

        if(it.startsWith("DHCP Enabled")) {
          infos[0] = it.includes("Yes") ? "DHCP自动" : "手动设定";
        }
        else if(it.startsWith('IPv4 Address')) {
          infos[1] = it.substring(it.indexOf(':')+2, it.indexOf('('));
        }
        else if(it.startsWith('Subnet Mask')) {
          infos[2] = it.substring(it.indexOf(':')+2);
        }
        else if(it.startsWith('Default Gateway')) {
          const gateway = it.substring(it.indexOf(':')+2);
          if(gateway && isValidIP(gateway)) {
            infos[3] = gateway;
          } else {
            const nextip = arrayNetworkcardInfo[i+1]?.trim();
            if(nextip && isValidIP(nextip)) {
              infos[3] =  nextip;
            }    
          }
        }
        else if(it.startsWith('DNS Servers')) {
          const dnsip = it.substring(it.indexOf(':')+2);
          if(dnsip && isValidIP(dnsip)) {
            infos[4] = dnsip;
            const nextip = arrayNetworkcardInfo[i+1]?.trim();
            if(nextip && isValidIP(nextip)) {
              infos[5] =  nextip;
            }    
          } else {
            const nextip = arrayNetworkcardInfo[i+1]?.trim();
            if(nextip && isValidIP(nextip)) {
              infos[4] =  nextip;
            }
            const nextip2 = arrayNetworkcardInfo[i+2]?.trim();
            if(nextip2 && isValidIP(nextip2)) {
              infos[5] =  nextip2;
            }
          }

          break;
        }
      }
      return infos;
    };

    //3 Windows 下手动设置网卡信息
    IPTOOLS.parseManualShell = (networkcardInfo) => {
      if (
        networkcardInfo.address.length > 0 &&
        networkcardInfo.subnetmask.length === 0 &&
        networkcardInfo.router.length > 0
      ) {
        alert("请输入子网掩码");
        setFocus('subnetmask');
        return { error: true };
      }

      let addressInfo = networkcardInfo.address;
      if (networkcardInfo.subnetmask.length > 0) {
        addressInfo += " " + networkcardInfo.subnetmask;
        if (networkcardInfo.router.length > 0) {
          addressInfo += " " + networkcardInfo.router;
        }
      }
      return { error: false, method: "setmanual", addressInfo: addressInfo };
    };

    //Windows 下获取网卡的 ip和dns 信息的统一处理过程
    IPTOOLS.getParseIPandDnsInfo = async function (network_name) {
      const infos = await window.ipchangServices.getNetworkInfo();
      return IPTOOLS.parseNetworkInfos(network_name, infos);
    }

  }

})();

function setFocus(nodeName) {
  document.getElementById(nodeName).focus();
}

//检测输入框的内容是否合规，有就检测，没有就不检测，但Ipv4必须要有
function check_address_subnetmask_router(input_data) {
      
  if (!isValidIP(input_data.address)) {
    alert("请输入有效的 IPv4 地址");
    setFocus('address');
    return false;
  }

  if (input_data.subnetmask.length > 0 && !isValidSubnetMask(input_data.subnetmask)) {
    alert("请输入有效的 子网掩码");
    setFocus('subnetmask');
    return false;
  }


  if (input_data.router.length > 0 && !isValidIP(input_data.router)) {
    alert("请输入有效的 网关地址");
    setFocus('router');
    return false;
  }

  if (input_data.dns1.length > 0 && !isValidIP(input_data.dns1)) {
    alert("请输入有效的 首选DNS 地址");
    setFocus('dns1');
    return false;
  }

  if (input_data.dns2.length > 0 && !isValidIP(input_data.dns2)) {
    alert("请输入有效的 备用DNS 地址");
    setFocus('dns2');
    return false;
  }

  return true;
}

// 正则表达式验证子网掩码
function isValidSubnetMask(subnetMask) {
  const regex =
    /^(?:(?:254|252|248|240|224|192|128|0)(?:\.0){0,3})|(?:255(?:\.(?:255|254|248|240|224|192|128|0){1,3}){0,3})$/;
  return regex.test(subnetMask);
}

// 正则表达式验证IPV4地址
function isValidIP(ip) {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

// 正则表达式验证MAC地址
function isValidMacAddress(mac) {
  const macAddressRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
  return macAddressRegex.test(mac);
}
