
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
      for (const it of dnsArray) {
        if (isValidIP(it)) {
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
      if (dnsArray.length === 0) {
        const resolvdns = await window.ipchangServices.getDnsFromResolv();
        const resArray = resolvdns.split('\n');
        for (const it of resArray) {
          const ns = it.split(' ')[1];
          if (ns && isValidIP(ns)) {
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
        //20251012 修改为只列出已经启用的网卡，不管网卡是否已连接
        if (arrayNK[0] === "Enabled") {
          networkNameList.push({ text: arrayNK[3], value: arrayNK[3] });
        }
      }
      return networkNameList;
    };

    //2 Windows 下解析某个网卡信息字符串
    IPTOOLS.parseNetworkInfos = function (networkcardInfo) {
      const infos = [KONG, KONG, KONG, KONG, KONG, KONG];
      const lines = networkcardInfo.split('\n').map(line => line.trim());

      // 正则表达式匹配所需字段
      const dhcpRegex = /DHCP enabled:\s*(Yes|No)/;
      const ipRegex = /IP Address:\s*([\d.]+)/;
      const subnetRegex = /Subnet Prefix:.*\(mask ([\d.]+)\)/;
      const gatewayRegex = /Default Gateway:\s*([\d.]+)/;
      const dnsDhcpRegex = /DNS servers configured through DHCP:\s*([\d.]+)/;
      const dnsStaticRegex = /Statically Configured DNS Servers:\s*([\d.]+)/;

      // 逐行解析
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 匹配 DHCP 启用状态
        if (dhcpRegex.test(line)) {
          infos[0] = line.match(dhcpRegex)[1] === 'Yes' ? 'DHCP自动' : '手动设定';
          continue;
        }
        // 匹配 IP 地址
        if (ipRegex.test(line)) {
          infos[1] = line.match(ipRegex)[1];
          continue;
        }
        // 匹配子网掩码
        if (subnetRegex.test(line)) {
          infos[2] = line.match(subnetRegex)[1];
          continue;
        }
        // 匹配默认网关
        if (gatewayRegex.test(line)) {
          infos[3] = line.match(gatewayRegex)[1] || '';
          continue;
        }
        // 匹配 DHCP 配置的 DNS 服务器
        if (dnsDhcpRegex.test(line)) {
          infos[4] = line.match(dnsDhcpRegex)[1];
          if (i + 1 < lines.length && lines[i + 1].match(/^\s*[\d.]+$/)) {
            infos[5] = lines[i + 1].trim();
          }
          continue;
        }
        // 匹配静态配置的 DNS 服务器
        if (dnsStaticRegex.test(line)) {
          infos[4] = line.match(dnsStaticRegex)[1];
          // 检查下一行是否还有 DNS 地址（静态 DNS 可能有多行）
          if (i + 1 < lines.length && lines[i + 1].match(/^\s*[\d.]+$/)) {
            infos[5] = lines[i + 1].trim();
          }
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
      const infos = await window.ipchangServices.getNetworkInfo(network_name);
      return IPTOOLS.parseNetworkInfos(infos);
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
