
(function () {
  if (utools.isWindows()) {

    function setOutKeys(lang) {
      if (lang === 'zh_CN') {
        IPTOOLS.cmd_out_keys.str_Enabled = '已启用';
        // 正则表达式匹配所需字段
        IPTOOLS.cmd_out_keys.reg_dhcpRegex = /DHCP 已启用:\s*(是|否)/;
        IPTOOLS.cmd_out_keys.reg_ipRegex = /IP 地址:\s*([\d.]+)/;
        IPTOOLS.cmd_out_keys.reg_subnetRegex = /子网前缀:.*\(掩码 ([\d.]+)\)/;
        IPTOOLS.cmd_out_keys.reg_gatewayRegex = /默认网关:\s*([\d.]+)/;
        IPTOOLS.cmd_out_keys.reg_dnsDhcpRegex = /通过 DHCP 配置的 DNS 服务器:\s*([\d.]+)/;
        IPTOOLS.cmd_out_keys.reg_dnsStaticRegex = /静态配置的 DNS 服务器:\s*([\d.]+)/;
      }
    }

    //1 Windows 下解析各个系统返回的获取网卡列表字符串
    IPTOOLS.parseNetworkNameList = function (result) {
      //console.log(result);
      if (result.includes("接口名称")) {
        setOutKeys("zh_CN");
      }
      
      const res = result.replace(/\r/g, "").split("\n");
      const networkNameList = [];
      for (let i = 0; i < res.length; i++) {
        const arrayNK = res[i].split(/\s{2,}/);
        //只显示已经连接的网卡，对已断开连接的网卡进行设置有很多问题
        //20251012 修改为只列出已经启用的网卡，不管网卡是否已连接
        if (arrayNK[0] === IPTOOLS.cmd_out_keys.str_Enabled) {
          networkNameList.push({ text: arrayNK[3], value: arrayNK[3] });
        }
      }
      return networkNameList;
    };



    //2 Windows 下解析某个网卡信息字符串
    IPTOOLS.parseNetworkInfos = function (networkcardInfo) {
      const infos = [KONG, KONG, KONG, KONG, KONG, KONG];
      const lines = networkcardInfo.split('\n').map(line => line.trim());

      // 逐行解析
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 匹配 DHCP 启用状态
        if (IPTOOLS.cmd_out_keys.reg_dhcpRegex.test(line)) {
          infos[0] = line.match(IPTOOLS.cmd_out_keys.reg_dhcpRegex)[1] === 'Yes' ? 'DHCP自动' : '手动设定';
          continue;
        }
        // 匹配 IP 地址
        if (IPTOOLS.cmd_out_keys.reg_ipRegex.test(line)) {
          infos[1] = line.match(IPTOOLS.cmd_out_keys.reg_ipRegex)[1];
          continue;
        }
        // 匹配子网掩码
        if (IPTOOLS.cmd_out_keys.reg_subnetRegex.test(line)) {
          infos[2] = line.match(IPTOOLS.cmd_out_keys.reg_subnetRegex)[1];
          continue;
        }
        // 匹配默认网关
        if (IPTOOLS.cmd_out_keys.reg_gatewayRegex.test(line)) {
          infos[3] = line.match(IPTOOLS.cmd_out_keys.reg_gatewayRegex)[1] || '';
          continue;
        }
        // 匹配 DHCP 配置的 DNS 服务器
        if (IPTOOLS.cmd_out_keys.reg_dnsDhcpRegex.test(line)) {
          infos[4] = line.match(IPTOOLS.cmd_out_keys.reg_dnsDhcpRegex)[1];
          if (i + 1 < lines.length && lines[i + 1].match(/^\s*[\d.]+$/)) {
            infos[5] = lines[i + 1].trim();
          }
          continue;
        }
        // 匹配静态配置的 DNS 服务器
        if (IPTOOLS.cmd_out_keys.reg_dnsStaticRegex.test(line)) {
          infos[4] = line.match(IPTOOLS.cmd_out_keys.reg_dnsStaticRegex)[1];
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

