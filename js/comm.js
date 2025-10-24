
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
