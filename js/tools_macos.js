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
          const cardName = res[i - 2].substr(res[i - 2].indexOf(":") + 2);
          networkNameList.push({ text: cardName, value: cardName });
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
        setFocus("subnetmask");
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
          return {
            error: false,
            method: "setmanual",
            addressInfo: addressInfo,
          };
        } else {
          return {
            error: false,
            method: "setmanualNorouter",
            addressInfo: addressInfo,
          };
        }
      }
    };

    //Macos 下解析dns 信息
    IPTOOLS.parseDnsInfo = function (dnsinfo) {
      const dnsArray = dnsinfo.split("\n");
      const result = [];
      for (const it of dnsArray) {
        if (isValidIP(it)) {
          result.push(it);
        }
      }
      return result;
    };

    //Macos 下获取网卡的 ip和dns 信息的统一处理过程
    IPTOOLS.getParseIPandDnsInfo = async function (network_name) {
      //获取网卡 ip 信息
      const networkcardInfo =
        await window.ipchangServices.getNetworkInfo(network_name);
      const array_carInfo = IPTOOLS.parseNetworkInfos(networkcardInfo);

      //获取网卡的 dns 信息
      const dnsinfo = await window.ipchangServices.getDnsInfos(network_name);
      const dnsArray = IPTOOLS.parseDnsInfo(dnsinfo);

      //如果找不到网卡的 dns 信息, 就去找系统的 dns 信息
      if (dnsArray.length === 0) {
        const resolvdns = await window.ipchangServices.getDnsFromResolv();
        const resArray = resolvdns.split("\n");
        for (const it of resArray) {
          const ns = it.split(" ")[1];
          if (ns && isValidIP(ns)) {
            dnsArray.push(ns);
          }
        }
      }
      array_carInfo[4] = dnsArray[0];
      array_carInfo[5] = dnsArray[1];
      return array_carInfo;
    };
  }
})();
