$(document).ready(function () {
  renewLeftPlanList();

  //获取网卡列表
  getInterfaceList();

  //绑定网卡列表值被改变的事件
  $("#select_network_list").change(select_network_chang);

  //网卡刷新按钮
  $("#img_refresh").click(select_network_chang);

  //使用 DHCP 点击事件
  $("#button_use_dhcp").click(function () {
    const theNetworkName = $("#select_network_list").val();
    if (theNetworkName === "") return;

    window.services.setNetworkToDHCP(theNetworkName).then(
      function (res) {
        const infos = ['DHCP自动','获取中...','获取中...','获取中...'];
        updateSpan_right_info(infos)
      },
      function (error) {
        console.log("出错了：" + error);
        alert("错误：当前网卡已经是 DHCP自动 模式");
      },
    );
  });

  //应用 按钮按下事件
  $("#button_application").click(function () {
    const theNetworkName = $("#select_network_list").val();
    if (theNetworkName === "") {
      alert("请先选择要手动设置的网卡");
      return;
    }

    const result = check_address_subnetmask_router();
    if (result.error) return;

    let shellInfo = iptools.parseManualShell(result);
    if (shellInfo.error) return;

    window.services.setNetworkToManual(theNetworkName, shellInfo).then(
      function (res) {
        let method = '手动设定';
        if(shellInfo.method ==='setmanualwithdhcprouter') {
          method = 'DHCP手动'
        }
        const infos = [method,result.address,result.subnetmask || '空',result.router || '空'];
        updateSpan_right_info(infos);
      },
      function (error) {
        console.log("出错了：" + error);
      },
    );
  });

  //获取网卡列表
  function getInterfaceList() {
    window.services.getNetworkNameList().then(
      function (res) {
        const networkNameList = iptools.parseNetworkNameList(res);
        for (let i = 0; i < networkNameList.length; i++) {
          $("#select_network_list").append(
            `<option value='${networkNameList[i]}'>${networkNameList[i]}</option>`,
          );
        }
        select_network_chang();
      },
      function (error) {
        console.log("出错了：" + error);
      },
    );
  }

  //新建按钮按下事件
  $("#button_create").click(function () {
    //utools.dbStorage.setItem('plan_list_db', {maxno:2,data:[[1,'192.168.10.1','255.255.255.0',''],[2,'192.168.10.2','255.255.255.0','']]});
    const result = check_address_subnetmask_router();
    if (result.error) return;
    let maxno = 1;
    const db = utools.dbStorage.getItem("plan_list_db");
    if (db === null) {
      utools.dbStorage.setItem("plan_list_db", {
        maxno: maxno,
        data: [[1, result.address, result.subnetmask, result.router,result.beizu]],
      });
    } else {
      maxno = db.maxno + 1;
      db.data.push([maxno, result.address, result.subnetmask, result.router,result.beizu]);
      utools.dbStorage.setItem("plan_list_db", { maxno: maxno, data: db.data });
    }
    const tbody = $("#tbody_plan_list");
    const tr = `<tr id="tbody_tr_plan_${maxno}" class="table-striped" style="cursor:pointer" onclick="tablePlanTrClick(${maxno});"><td>${result.address}</td><td>${result.beizu}</td></tr>`;
    tbody.append(tr);
    //console.log(utools.dbStorage.getItem('plan_list_db'))
  });

  //修改按钮被按下事件
  $("#button_update").click(function () {
    const updataid = $("#hidden_curr_plan_id").val();
    //console.log('updataid = ' + updataid);
    if (updataid === "") {
      alert("请先在左边列表选择一个要修改的方案");
      return;
    }

    const numberupdataid = Number(updataid);

    const result = check_address_subnetmask_router();
    if (result.error) return;

    const db = utools.dbStorage.getItem("plan_list_db");

    for (let i = 0; i < db.data.length; i++) {
      if (db.data[i][0] === numberupdataid) {
        db.data[i][1] = result.address;
        db.data[i][2] = result.subnetmask;
        db.data[i][3] = result.router;
        db.data[i][4] = result.beizu;
        //const tr = `<tr id="tbody_tr_plan_${updataid}" class="table-striped" style="cursor:pointer" onclick="tablePlanTrClick(${updataid});"><td>${result.address}</td></tr>`;
        //console.log($("#tbody_tr_plan_" + updataid + " td:first").text());
        $("#tbody_tr_plan_" + updataid + " td:first").text(result.address);
        $("#tbody_tr_plan_" + updataid + " td:last").text(result.beizu);
        utools.dbStorage.setItem("plan_list_db", {
          maxno: db.maxno,
          data: db.data,
        });

        break;
      }
    }
  });

  //删除按钮被按下事件
  $("#button_delete").click(function () {
    //utools.dbStorage.removeItem("plan_list_db");
    const delid = $("#hidden_curr_plan_id").val();
    //console.log('delid = ' + delid);
    if (delid === "") {
      alert("请先在左边列表选择一个要删除的方案");
      return;
    }
    const numberdelid = Number(delid);
    const db = utools.dbStorage.getItem("plan_list_db");
    for (let i = 0; i < db.data.length; i++) {
      if (db.data[i][0] === numberdelid) {
        $("#tbody_tr_plan_" + delid).remove();
        db.data.splice(i, 1);
        utools.dbStorage.setItem("plan_list_db", {
          maxno: db.maxno,
          data: db.data,
        });
        clearAllInput();
        break;
      }
    }
    
  });

  //每隔 3 秒就更新一次右侧网卡信息
  setInterval(select_network_chang, 3000);
});

//检测输入框的内容是否合规，有就检测，没有就不检测，但Ipv4必须要有
function check_address_subnetmask_router() {
  const address = $("#input_Address").val().trim();
  if (!isValidIP(address)) {
    alert("请输入有效的 IPv4 地址");
    $("#input_Address").focus();
    return { error: true };
  }

  const subnetmask = $("#input_Subnetmask").val().trim();
  if (subnetmask.length > 0 && !isValidSubnetMask(subnetmask)) {
    alert("请输入有效的子网掩码");
    $("#input_Subnetmask").focus();
    return { error: true };
  }
  const router = $("#input_Router").val().trim();
  if (router.length > 0 && !isValidIP(router)) {
    alert("请输入有效的网关地址");
    $("#input_Router").focus();
    return { error: true };
  }


  return {
    error: false,
    address: address,
    subnetmask: subnetmask,
    router: router,
    beizu:$("#input_Beizu").val().trim()
  };
}

//清空输入框
function clearAllInput() {
  $("#hidden_curr_plan_id").val("");
  $("#input_Address").val("");
  $("#input_Subnetmask").val("");
  $("#input_Router").val("");
}

//填充左边方案列表
function renewLeftPlanList() {
  const db = utools.dbStorage.getItem("plan_list_db");
  //console.log(db)
  if (db === null) return;
  const tbody = $("#tbody_plan_list");
  for (let i = 0; i < db.data.length; i++) {
    const beizu = db.data[i][4] || '';
    const tr = `<tr id="tbody_tr_plan_${db.data[i][0]}" class="table-striped" style="cursor:pointer" onclick="tablePlanTrClick(${db.data[i][0]});"><td>${db.data[i][1]}</td><td>${beizu}</td></tr>`;
    tbody.append(tr);
  }
}

//方案列表点击事件
function tablePlanTrClick(planid) {
  $(".table-striped").css("background-color", "white");
  $("#tbody_tr_plan_" + planid).css("background-color", "#f0f0f5");

  const db = utools.dbStorage.getItem("plan_list_db");
  for (let i = 0; i < db.data.length; i++) {
    if (db.data[i][0] === planid) {
      $("#hidden_curr_plan_id").val(planid);
      $("#input_Address").val(db.data[i][1]);
      $("#input_Subnetmask").val(db.data[i][2]);
      $("#input_Router").val(db.data[i][3]);
      $("#input_Beizu").val(db.data[i][4]);
      break;
    }
  }
}

//根据网卡名称和信息更新右侧网卡信息
function renewNetworkcardInfo(networkcardName, networkcardInfo) {
  $("#span_network_name").text(networkcardName);
  const infos = iptools.parseNetworkInfos(networkcardInfo);
  updateSpan_right_info(infos);
}

//网卡列表改变事件
function select_network_chang() {
  if(iptools.task_Interval_running === true) return;
  iptools.task_Interval_running = true;
  const theNetworkName = $("#select_network_list").val();
  if (theNetworkName === "") return;

  window.services.getNetworkInfo(theNetworkName).then(
    function (networkcardInfo) {
      renewNetworkcardInfo(theNetworkName, networkcardInfo);
    },
    function (error) {
      console.log("出错了：" + error);
    },
  ).finally(()=> {
    iptools.task_Interval_running = false;
  }

  );
}

function updateSpan_right_info(infos) {
  $("#span_ip_getMethod").text(infos[0]);
  $("#span_ip_Address").text(infos[1]);
  $("#span_ip_Subnetmask").text(infos[2]);
  $("#span_ip_Router").text(infos[3]);
}
