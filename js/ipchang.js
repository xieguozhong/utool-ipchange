const { createApp } = Vue;
utools.onPluginEnter(() => {
  IPTOOLS.plugin_showing = true;
  console.info("进入插件, 开始执行获取网卡信息的定时任务");
});
utools.onPluginOut(() => {
  IPTOOLS.plugin_showing = false;
  console.info("退出插件, 暂停执行获取网卡信息的定时任务");
});

const VUEApp = {
  data() {
    return {

      plan_list_db: null, //存储的所有方案数据
      curr_plan_id: 0, //存储当前左边列表中选中的方案 id, 不是 index

      network_selected: '',//当前选择的网卡
      network_options: [],//网卡列表

      //输入框里面的数据
      input_data: {
        address: '',
        subnetmask: '255.255.255.0',
        router: '',
        beizu: '',
        dns1: '',
        dns2: ''
      },
      //右侧信息
      right_span_infos: {
        method: '',
        address: '',
        subnetmask: '',
        router: '',
        dns1: '',
        dns2: ''
      }
    }
  },
  created() {
    this.get_plan_list_db();
    this.getInterfaceList();
  },

  mounted() {
    //每隔 3 秒就更新一次右侧网卡信息
    setInterval(this.select_network_chang, 3000);
  },

  watch: {
    // 每当 network_selected 改变时，就立即去更新右侧的网卡信息
    network_selected() {
      this.select_network_chang();
    }
  },

  methods: {
    //从 dbStorage 中获取方案数据
    get_plan_list_db() {
      const db = utools.dbStorage.getItem(DB_NAME);

      if (db) {
        this.plan_list_db = db;
      } else {
        this.plan_list_db = { maxno: 0, data: [] };
      }

    },

    //更新右侧网卡信息
    refresh_right_infos(networkInfos) {

      this.right_span_infos.method = networkInfos[0] || KONG;
      this.right_span_infos.address = networkInfos[1] || KONG;
      this.right_span_infos.subnetmask = networkInfos[2] || KONG;
      this.right_span_infos.router = networkInfos[3] || KONG;
      this.right_span_infos.dns1 = networkInfos[4] || KONG;
      this.right_span_infos.dns2 = networkInfos[5] || KONG;
    },

    //方案列表点击事件
    tablePlanTrClick(planid) {

      this.curr_plan_id = Number(planid);

      for (const it of this.plan_list_db.data) {
        if (it[0] === planid) {
          this.input_data.address = it[1] || '';
          this.input_data.subnetmask = it[2] || '';
          this.input_data.router = it[3] || '';
          this.input_data.beizu = it[4] || '';
          this.input_data.dns1 = it[5] || '';
          this.input_data.dns2 = it[6] || '';
          break;
        }
      }
    },

    //获取网卡列表
    async getInterfaceList() {

      const res = await window.ipchangServices.getNetworkNameList();
      
      this.network_options = IPTOOLS.parseNetworkNameList(res);
      if (this.network_options.length > 0) {
        this.network_selected = this.network_options[0].value;
      }

    },

    //使用 DHCP 按钮事件
    async button_use_dhcp() {
      if (this.network_selected === "") {
        alert("请先选择要设置的网卡");
        return;
      }

      try {

        //把网卡设置为 DHCP 自动获取模式
        await window.ipchangServices.setNetworkToDHCP(this.network_selected);
        this.refresh_right_infos([
          'DHCP自动',
          '获取中...',
          '获取中...',
          '获取中...',
          '获取中...',
          '获取中...'
        ]);

      } catch (error) {
        alert("出错了，可能的原因： 当前网卡已经是DHCP自动模式");
      }

    },


    //新建按钮按下事件
    button_create() {
      if (!check_address_subnetmask_router(this.input_data)) return;

      const db = utools.dbStorage.getItem(DB_NAME);
      let newdata = null;
      if (db) {
        const maxno = db.maxno + 1;
        const newfanan = [maxno, this.input_data.address, this.input_data.subnetmask, this.input_data.router, this.input_data.beizu, this.input_data.dns1, this.input_data.dns2];
        db.data.push(newfanan);
        newdata = { maxno: maxno, data: db.data };
      } else {
        const newfanan = [1, this.input_data.address, this.input_data.subnetmask, this.input_data.router, this.input_data.beizu, this.input_data.dns1, this.input_data.dns2];
        newdata = { maxno: 1, data: [newfanan] };
      }
      this.plan_list_db = newdata;
      utools.dbStorage.setItem(DB_NAME, newdata);
    },

    //修改按钮被按下事件
    button_update() {
      if (this.curr_plan_id === 0) {
        alert("请先在左边列表选择一个要修改的方案");
        return;
      }

      if (!check_address_subnetmask_router(this.input_data)) return;

      const db = utools.dbStorage.getItem(DB_NAME);

      for (let i = 0; i < db.data.length; i++) {
        if (db.data[i][0] === this.curr_plan_id) {
          db.data[i][1] = this.input_data.address;
          db.data[i][2] = this.input_data.subnetmask;
          db.data[i][3] = this.input_data.router;
          db.data[i][4] = this.input_data.beizu;
          db.data[i][5] = this.input_data.dns1;
          db.data[i][6] = this.input_data.dns2;

          const newdata = { maxno: db.maxno, data: db.data };
          this.plan_list_db = newdata;
          utools.dbStorage.setItem(DB_NAME, newdata);

          break;
        }
      }
    },


    //删除按钮被按下事件
    button_delete() {

      if (this.curr_plan_id === 0) {
        alert("请先在左边方案列表中选择一个要删除的方案");
        return;
      }

      const db = utools.dbStorage.getItem(DB_NAME);
      for (let i = 0; i < db.data.length; i++) {
        if (db.data[i][0] === this.curr_plan_id) {
          this.curr_plan_id = 0;
          db.data.splice(i, 1);
          const newdata = { maxno: db.maxno, data: db.data };
          this.plan_list_db = newdata;
          utools.dbStorage.setItem(DB_NAME, newdata);
          this.clearAllInput();
          break;
        }
      }

    },

    //应用 按钮按下事件
    async button_application() {
      if (this.network_selected === "") {
        alert("请先选择要设置的网卡");
        return;
      }

      if (!check_address_subnetmask_router(this.input_data)) return;

      const shellInfo = IPTOOLS.parseManualShell(this.input_data);

      //先处理 dns 相关内容, 如果写了dns就用dns，没有写dns就用网关
      const dnsInfos = ((this.input_data.dns1 + " " + this.input_data.dns2).trim()) || this.input_data.router;

      try {
        //设置网卡的 IP 地址，
        await window.ipchangServices.setNetworkToManual(dnsInfos, this.network_selected, shellInfo);
        const method = (shellInfo.method === 'setmanualwithdhcprouter' ? 'DHCP手动' : '手动设定');

        this.refresh_right_infos([
          method,
          this.input_data.address,
          this.input_data.subnetmask,
          this.input_data.router,
          this.input_data.dns1,
          this.input_data.dns2
        ]);
      } catch (error) {
        console.error("设置 IP 出错了：" + error);
        alert("出错了：\n请检查本机或者网络中已经存在当前ip信息的网卡或设备");
      }
    },


    //清空输入框
    clearAllInput() {
      for (const it in this.input_data) {
        this.input_data[it] = '';
      }
    },

    //网卡列表改变事件
    async select_network_chang() {

      if (IPTOOLS.plugin_showing === false || IPTOOLS.task_Interval_running === true || this.network_selected === "") return;

      try {
        IPTOOLS.task_Interval_running = true;
        const res = await IPTOOLS.getParseIPandDnsInfo(this.network_selected);
        this.refresh_right_infos(res);
      } catch (error) {
        console.error("获取网卡信息出错了：" + error);
      } finally {
        IPTOOLS.task_Interval_running = false;
      }
    }
  }
};

// 挂载Vue应用到id为app的DOM元素上
createApp(VUEApp).mount('.container-fluid');

