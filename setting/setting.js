const { ipcRenderer } = require('electron')

let btn_test_str = "테스트";

// ----------------------------------------------------------------------------

window.addEventListener('load', function () {
  updateOnlineStatus();

  connectionOpen();
  initCal();
  inputsEV();
  btnsEV();
  setDayHolidayBtnsEV();
  tabsEV();
  pillsEV();
})

// ----------------------------------------------------------------------------

let connectionOpen = function() {
  let msg = {"action": "connection-open"};
  ipcRenderer.send("connection", JSON.stringify(msg));
}

let holidayOpen = function() {
  msg = {"action": "holiday-open"};
  ipcRenderer.send("setting", JSON.stringify(msg));
}

let initForm = function(config) {
  if(config.mode != "") {
    document.getElementById("connection_"+ config.mode +"_btn").click();
    document.getElementById("check_"+ config.mode).classList.remove("d-none");
    // localStorage.setItem("mode", config.mode);
  }

  if(config.user != "" && config.user  != "undefined" && config.user != undefined && config.user != null) document.getElementById('setting_user').value = config.user;
  if(config.password != "" && config.password  != "undefined" && config.password != undefined && config.password != null) document.getElementById('setting_pw').value = config.password;

  if(config.connectString != "" && config.connectString != undefined) {
    if(config.connectString.indexOf(":") >= 0) {
      let connectionArr1 = config.connectString.split(":");
      document.getElementById('setting_ip').value = connectionArr1[0];

      if(connectionArr1[1].indexOf("/") >= 0) {
        let connectionArr2 = connectionArr1[1].split("/");
        document.getElementById('setting_port').value = connectionArr2[0];
        document.getElementById('setting_sid').value = connectionArr2[1];
      }
    } else {
      if(config.connectString.indexOf("/") >= 0) {
        let connectionArr2 = config.connectString.split("/");
        document.getElementById('setting_sid').value = connectionArr2[1];
      }
    }
  }

  if(config.loan_period != "" && config.loan_period  != "undefined" && config.loan_period != undefined && config.loan_period != null) document.getElementById('setting_loan_period').value = config.loan_period;
}

let validateForm = function(className) {
  let isValid = false, values = {};
  let inputs = document.getElementsByClassName(className);

  for(let i of inputs) {
    let id = i.getAttribute("id");
    let $el = $("#"+id);

    $el.removeClass("is-invalid");

    if($el.val() == "") {
      $el.addClass("is-invalid").focus();
      return false;
    } else {
      values[id] = $el.val();
    }
  }
  return values;
}

let initCal = function(yyyy, mm) {
  let markup = '', elem = [];
  let date = new Date();

  if(typeof yyyy == "undefined") yyyy = date.getFullYear();
  if(typeof mm == "undefined") mm = date.getMonth() + 1;

  document.getElementById("cal_year_area").innerHTML = yyyy;
  document.getElementById("cal_month_area").innerHTML = mm;

  date = new Date(yyyy, mm-1, 1);
  let firstDay = date.getDay();

  // prefix
  if(firstDay != 0) {
    for(let i=firstDay-1; i>=0; i--) {
      date.setDate(date.getDate() - 1);
      elem.unshift('<button type="button" class="btn cal-btn" disabled>'+ date.getDate() +'</button>');
    }
  }

  let lastDate = new Date(yyyy, mm, 0).getDate();

  for(let i=1; i<=lastDate; i++) {
    elem.push('<button type="button" class="btn cal-btn setDateHolidayBtn" id="setDateHolidayBtn-'+ i +'" value="'+ i +'" data-day="'+ firstDay%7 +'">'+ i +'</button>');
    firstDay++;
  }

  date = new Date(yyyy, mm, 0);
  let lastDay = date.getDay();

  // suffix
  if(lastDay != 6) {
    for(let i=lastDay+1; i<=6; i++) {
      date.setDate(date.getDate() + 1);
      elem.push('<button type="button" class="btn cal-btn" disabled>'+ date.getDate() +'</button>');
    }
  }

  for(let item of elem) markup += item;
  document.getElementById("cal_date_area").innerHTML = markup;
  for(let i of document.getElementsByClassName("setDayHolidayBtn")) i.classList.remove("holiday-fixDate");

  holidayOpen();
  setDateHolidayBtnsEV();
}

let connectionTest = function() {
  let btn_test = document.getElementById('btn-connection-test');

  btn_test.classList.remove("btn-outline-danger", "btn-outline-success");
  btn_test.classList.add("btn-outline-dark");

  let msg = {"action": "connection-test"};
  ipcRenderer.send("connection", JSON.stringify(msg));

  btn_test.disabled = true;
  $("#btn-connection-test").html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 확인중 ...');
}

let connectionSave = function(mode) {
  let msg = {"action": "connection-save"};

  if(mode == "online") {
    let btn_save = document.getElementById('btn-connection-online-save');

    $("#btn-connection-online-save").html('저장');
    btn_save.classList.remove("btn-danger", "btn-success");
    btn_save.classList.add("btn-outline-primary");

    let values = validateForm("connection-online-inputs");
    if(!values) return false;

    msg.settingInfo = {
      "mode": mode,
      "user": values.setting_user,
      "password": values.setting_pw,
      "connectString": values.setting_ip + ':' + values.setting_port + '/' + values.setting_sid
    }

    localStorage.setItem("mode", "online");
  } else {
    let values = validateForm("connection-offline-inputs");

    if(!values) return false;

    msg.settingInfo = {
      "mode": mode,
      "loan_period": values.setting_loan_period
    }

    localStorage.setItem("mode", "offline");
  }

  ipcRenderer.send("connection", JSON.stringify(msg));
}

let configSave = function(item) {
  let msg = {"action": item + "-save"};
  let el;

  switch(item) {
    case "grade":
      el = document.getElementsByClassName("listGrade");
      break;

    case "shelf":
      el = document.getElementsByClassName("listShelf");
      break;

    case "manage_code":
      el = document.getElementsByClassName("listManage_code");
      break;
  }

  for(let i of el) {
    if(i.checked) {
      msg[item] = {"rec_key": i.getAttribute("data-rec_key")};

      switch(item) {
        case "grade":
          msg.grade.loan_period = i.getAttribute("data-loan_period");
          msg.grade.code = i.getAttribute("data-code");
          break;

        case "shelf":
          msg.shelf.code = i.getAttribute("data-code");
          break;

        case "manage_code":
          msg.manage_code.manage_code = i.getAttribute("data-manage_code");
          break;
      }
    }
  }

  if(typeof msg[item] != "undefined") {
    ipcRenderer.send(item, JSON.stringify(msg));
  } else {
    $("#"+ item +"-list>input:first").focus();
  }
}

let holidaySave = function(type, el) {
  el.disabled = true;

  let year = document.getElementById("cal_year_area").innerHTML;
  let month = document.getElementById("cal_month_area").innerHTML;

  let msg = {"action": "holiday-save"};
  msg.holiday = {
    "type": type,
    "year": year,
    "month": month
  }
  if(type == "fixDay") {
    msg.holiday.fixDay = el.getAttribute("data-day");
  } else {
    msg.holiday.date = el.value
  }

  ipcRenderer.send("setting", JSON.stringify(msg));
}

let themeSave = function() {
  let msg = {"action": "theme-save"};
  let el = document.getElementsByClassName("listTheme");

  for(let i of el) {
    if(i.checked) msg.theme = {"name": i.dataset.filename};
  }

  ipcRenderer.send("theme", JSON.stringify(msg));
}


let connectionSaveResult = function(result) {
  let btn_save = document.getElementById('btn-connection-'+ result.mode +'-save');

  if(result.isSuccess) {
    for(let x of document.getElementsByClassName("using_mode")) x.classList.add("d-none");
    document.getElementById("check_"+ result.mode).classList.remove("d-none");
    localStorage.setItem("mode", result.mode);
    if(result.mode == "online") document.getElementById("btn-connection-test").disabled = false;
    btn_save.classList.remove("btn-outline-primary");
    btn_save.disabled = true;
    btn_save.classList.toggle("btn-success", "btn-danger");
    btn_save.innerHTML = "저장완료";
  } else {
    btn_save.classList.toggle("btn-danger", "btn-success");
    btn_save.innerHTML = "저장실패";
  }
}

let configSaveResult = function(item, result) {
  let btn_save = document.getElementById('btn-'+ item +'-save');
  btn_save.classList.remove("btn-outline-primary");

  if(result.isSuccess) {
    btn_save.disabled = true;
    btn_save.classList.toggle("btn-success", "btn-danger");
    btn_save.innerHTML = "저장완료";
  } else {
    btn_save.classList.toggle("btn-danger", "btn-success");
    btn_save.innerHTML = "저장실패";
  }

  location.href = "#"+ item +"-tab-btn";
}

let holidaySaveResult = function(result) {
  console.log(result);

  let el = document.getElementById(result.type == "fixDay" ? "setDayHolidayBtn-" + result.target : "setDateHolidayBtn-" + result.target);
  let elClass = el.classList;

  if(result.isSuccess) {
    switch (result.type) {
      case "fixDay":
        elClass.toggle("holiday-fixDate");
        for(let i of document.getElementsByClassName("setDateHolidayBtn")) if(i.getAttribute("data-day") == el.getAttribute("data-day")) {
          if(i.classList.contains("holiday-registered")) holidaySave("registered", i);
          i.classList.toggle("holiday-fixDate");
        }
        break;

      case "registered":
        elClass.toggle("holiday-registered");
        break;

      case "excepted":
        elClass.toggle("holiday-excepted");
        break;
    }
  } else {
    console.log("holidaySave Fail");
  }

  el.disabled = false;
}

let themeSaveResult = function(result) {
  let btn_save = document.getElementById('btn-theme-save');

  btn_save.classList.remove("btn-outline-primary");
  if(result.isSuccess) {
    btn_save.disabled = true;
    btn_save.classList.toggle("btn-success", "btn-danger");
    btn_save.innerHTML = "저장완료";
  } else {
    btn_save.classList.toggle("btn-danger", "btn-success");
    btn_save.innerHTML = "저장실패";
  }
}

let connectionTestResult = function(result) {
  let btn_test = document.getElementById('btn-connection-test');

  console.log(result);

  btn_test.classList.remove("btn-outline-dark");
  if(result.isSuccess) {
    btn_test_str = "연결 성공";
    btn_test.classList.toggle("btn-outline-success", "btn-outline-danger");
  } else {
    btn_test_str = "연결 실패";
    btn_test.classList.toggle("btn-outline-danger", "btn-outline-success");
  }

  $("#btn-connection-test").html(btn_test_str);
  btn_test.disabled = false;
}

// ----------------------------------------------------------------------------

ipcRenderer.on('connection-moveTo', function (event, arg) {
  document.getElementById(JSON.parse(arg).where).click();
});

ipcRenderer.on('connection-fail', function (event, arg) {
  let msg = '<div class="alert alert-secondary" role="alert">이용하려면 "<strong>서버 > 온라인</strong>" 설정이 필요합니다.</div>';
  document.getElementById(JSON.parse(arg).item + "-list").innerHTML = msg;
  document.getElementById("btn-" + JSON.parse(arg).item + "-save").classList.add("d-none");
});

ipcRenderer.on('connection-open', function (event, arg) {
  initForm(JSON.parse(arg))
});

ipcRenderer.on('connection-save-result', function (event, arg) {
  connectionSaveResult(JSON.parse(arg));
});

ipcRenderer.on('connection-test-result', function (event, arg) {
  connectionTestResult(JSON.parse(arg));
});

ipcRenderer.on('grade-save-result', function (event, arg) {
  configSaveResult("grade", JSON.parse(arg))
});

ipcRenderer.on('shelf-save-result', function (event, arg) {
  configSaveResult("shelf", JSON.parse(arg))
});

ipcRenderer.on('manage_code-save-result', function (event, arg) {
  configSaveResult("manage_code", JSON.parse(arg))
});

ipcRenderer.on('holiday-save-result', function (event, arg) {
  holidaySaveResult(JSON.parse(arg))
});

ipcRenderer.on('theme-save-result', function (event, arg) {
  themeSaveResult(JSON.parse(arg))
});

ipcRenderer.on('grades', function (event, arg) {
  let grades = JSON.parse(arg), elem = "", checkedElem = "";

  grades.forEach(function(grade, i){
    elem += '<input class="list-group-item-check listGrade" type="radio" name="listGrade" id="listGrade'+ i +'" data-rec_key="'+ grade.REC_KEY +'" data-code="'+ grade.CODE +'" data-description="'+ grade.DESCRIPTION +'" data-loan_period="'+ grade.LOAN_PERIOD +'" onchange="focusGradeSaveBtn()">';
    elem += '<label class="list-group-item" for="listGrade'+ i +'">';
    elem += '['+ grade.CODE + '] ' + grade.DESCRIPTION;
    elem += '<span class="d-block small opacity-50">'+ grade.LOAN_PERIOD +'일</span>';
    elem += '</label>';

    if(grade.isChecked) checkedElem = 'listGrade'+ i;
  });

  document.getElementById("grade-list").innerHTML = elem;
  if(checkedElem != "") document.getElementById(checkedElem).checked = true;
  document.getElementById("btn-grade-save").classList.remove("d-none");
});

ipcRenderer.on('shelves', function (event, arg) {
  let shelves = JSON.parse(arg), elem = "", checkedElem = "";

  shelves.forEach(function(shelf, i){
    elem += '<input class="list-group-item-check listShelf" type="radio" name="listShelf" id="listShelf'+ i +'" data-rec_key="'+ shelf.REC_KEY +'" data-code="'+ shelf.CODE +'" data-description="'+ shelf.DESCRIPTION +'" onchange="focusShelfSaveBtn()">';
    elem += '<label class="list-group-item" for="listShelf'+ i +'">';
    elem += shelf.DESCRIPTION;
    elem += '<span class="d-block small opacity-50">'+ shelf.CODE +'</span>';
    elem += '</label>';

    if(shelf.isChecked) checkedElem = 'listShelf'+ i;
  });
  document.getElementById("shelf-list").innerHTML = elem;
  if(checkedElem != "") document.getElementById(checkedElem).checked = true;
  document.getElementById("btn-shelf-save").classList.remove("d-none");
});

ipcRenderer.on('manage_codes', function (event, arg) {
  let manage_codes = JSON.parse(arg), elem = "", checkedElem = "";

  manage_codes.forEach(function(manage_code, i){
    elem += '<input class="list-group-item-check listManage_code" type="radio" name="listManage_code" id="listManage_code'+ i +'" data-rec_key="'+ manage_code.REC_KEY +'" data-manage_code="'+ manage_code.MANAGE_CODE +'" data-lib_name="'+ manage_code.LIB_NAME +'" data-lib_code="'+ manage_code.LIB_CODE +'" onchange="focusManage_codeSaveBtn()">';
    elem += '<label class="list-group-item" for="listManage_code'+ i +'">';
    elem += manage_code.LIB_NAME;
    elem += '<span class="d-block small opacity-50">'+ manage_code.LIB_CODE +'</span>';
    elem += '</label>';

    if(manage_code.isChecked) checkedElem = 'listManage_code'+ i;
  });
  document.getElementById("manage_code-list").innerHTML = elem;
  if(checkedElem != "") document.getElementById(checkedElem).checked = true;
  document.getElementById("btn-manage_code-save").classList.remove("d-none");
});

ipcRenderer.on('displays', function (event, arg) {
  let displays = JSON.parse(arg), elem = "";

  let arrayForSorting = [];
  displays.forEach(function(display, i){
    arrayForSorting.push(display.bounds.x);
  });
  arrayForSorting.sort(function(a, b){return a - b});

  for(let x of arrayForSorting) {
    displays.forEach(function(display, i){
      if(x == display.bounds.x) {
        console.log(display);
        elem += '<svg class="float" width="'+ display.bounds.width/10 +'" height="'+ display.bounds.height/10 +'">'
        elem += '<rect width="'+ display.bounds.width/10 +'" height="'+ display.bounds.height/10 +'" style="fill:white;stroke-width:2;stroke:rgb(0,0,0)" />';
        elem += '</svg>';
      }
    });
  }

  document.getElementById("display-list").innerHTML = elem;
});

ipcRenderer.on('themes', function (event, arg) {
  let data = JSON.parse(arg), elem = "";

  data.themes.forEach(function(theme, i) {
    let isChecked = "", isDisabled = "", txt = "선택";
    if(theme.filename == data.selected) isChecked = " checked", isDisabled = " disabled", txt = "이용중";
    elem += '<div class="card mb-3"><img src="../theme/'+ theme.thumbnail +'" class="card-img-top" alt="...">';
    elem += '<div class="card-body"><h5 class="card-title">'+ theme.title;

    if(theme.isOnline) {
      elem += '<span class="badge rounded-1 fw-light bg-dark mx-3">온라인전용</span>';
      if(localStorage.getItem("mode") == "offline") isDisabled = " disabled";
    }

    elem += '</h5><p class="card-text">'+ theme.desc +'</p><div class="card-text">';
    elem += '<input type="radio" class="btn-check listTheme" name="themes" id="theme'+ i +'" data-filename="'+ theme.filename +'" autocomplete="off" onchange="focusthemeSaveBtn()" '+ isChecked + isDisabled +'>';
    elem += '<label class="btn btn-outline-success" for="theme'+ i +'">'+ txt +'</label></div></div></div>';
  });

  document.getElementById("theme-list").innerHTML = elem;
});

ipcRenderer.on('holiday-open', function (event, arg) {
  let holidays = JSON.parse(arg);
  let yyyy = document.getElementById("cal_year_area").innerHTML;
  let mm = document.getElementById("cal_month_area").innerHTML;
  let fixDay = [];

  for(let i of holidays.fixDate) if(i.year == yyyy) for(let date of i[mm]) document.getElementById("setDateHolidayBtn-"+ date).classList.add("holiday-fixDate");
  for(let i of holidays.registered) if(i.year == yyyy) if(typeof i[mm] != "undefined") for(let date of i[mm]) document.getElementById("setDateHolidayBtn-"+ date).classList.add("holiday-registered");
  for(let i of holidays.excepted) if(i.year == yyyy) if(typeof i[mm] != "undefined") for(let date of i[mm]) document.getElementById("setDateHolidayBtn-"+ date).classList.add("holiday-excepted");

  if(typeof holidays.fixDay[yyyy] != "undefined") for(let day of holidays.fixDay[yyyy]) document.getElementById("setDayHolidayBtn-"+ day).classList.add("holiday-fixDate");
});

// ----------------------------------------------------------------------------

let setOnlineStatus = function(status) {
  if(status == "online") {
    document.getElementById("grade-tab-btn").disabled = false;
    document.getElementById("shelf-tab-btn").disabled = false;
    document.getElementById("manage_code-tab-btn").disabled = false;
  } else {
    document.getElementById("grade-tab-btn").disabled = true;
    document.getElementById("shelf-tab-btn").disabled = true;
    document.getElementById("manage_code-tab-btn").disabled = true;
  }
}

let updateOnlineStatus = function() {
  if(navigator.onLine) {
    document.getElementById("connection_online_btn").disabled = false;
    document.getElementById("connection_online_btn").click();
    setOnlineStatus("online");
  } else {
    document.getElementById("connection_online_btn").disabled = true;
    document.getElementById("connection_offline_btn").click();
    setOnlineStatus("offline");
  }
}

window.addEventListener('online', updateOnlineStatus)
window.addEventListener('offline', updateOnlineStatus)


// -----------------------------------------------------------------------------

let focusGradeSaveBtn = function() { document.getElementById("btn-grade-save").focus(); }
let focusShelfSaveBtn = function() { document.getElementById("btn-shelf-save").focus(); }
let focusManage_codeSaveBtn = function() { document.getElementById("btn-manage_code-save").focus(); }
let focusthemeSaveBtn = function() { document.getElementById("btn-theme-save").focus(); }

// ----------------------------------------------------------------------------- EV

let modalCloseChoice = new bootstrap.Modal(document.getElementById("modalCloseChoice"));

document.getElementById("btnSettingRelaunch").onclick = function() {
  let msg = {"action": "setting-relaunch"};
  ipcRenderer.send("setting", JSON.stringify(msg));
}

document.getElementById("btnSettingExit").onclick = function() {
  let msg = {"action": "setting-close"};
  ipcRenderer.send("setting", JSON.stringify(msg));
}

// document.getElementById("display-tab-btn").onclick = function() {
//   let msg = {"action": "display-open"};
//   ipcRenderer.send("display", JSON.stringify(msg));
// }

document.getElementById("btn-connection-online-save").onclick = function() {
  connectionSave("online");
}

document.getElementById("btn-connection-offline-save").onclick = function() {
  connectionSave("offline");
}

document.getElementById("btn-connection-test").onclick = connectionTest;

document.getElementById("btn-connection-test").onmouseover = function() {
  $("#btn-connection-test").html("테스트");
}

document.getElementById("btn-connection-test").onmouseout = function() {
  $("#btn-connection-test").html(btn_test_str);
}

document.getElementById("btn-grade-save").onclick = function() {
  configSave("grade");
}

document.getElementById("btn-shelf-save").onclick = function() {
  configSave("shelf");
}

document.getElementById("btn-manage_code-save").onclick = function() {
  configSave("manage_code");
}

document.getElementById("btn-theme-save").onclick = function() {
  themeSave();
}

document.getElementById("prev_month").onclick = function() {
  let d = new Date();
  d.setFullYear(document.getElementById("cal_year_area").innerHTML);
  d.setMonth(Number(document.getElementById("cal_month_area").innerHTML) - 2);
  initCal(d.getFullYear(), d.getMonth() + 1);
}

document.getElementById("next_month").onclick = function() {
  let d = new Date();
  d.setFullYear(document.getElementById("cal_year_area").innerHTML);
  d.setMonth(Number(document.getElementById("cal_month_area").innerHTML));
  initCal(d.getFullYear(), d.getMonth() + 1);
}


let inputsEV = function() {
  let btn_online_save = document.getElementById("btn-connection-online-save");
  let inputs = document.getElementsByClassName("connection-online-inputs");
  for(let i of inputs) {
    i.onkeydown = function(ev) {
      if(ev.keyCode == 13) {
        if(btn_online_save.disabled == false) btn_online_save.click();
      } else {
        $("#btn-connection-online-save").html('저장');
        btn_online_save.disabled = false;
      }
    }
  }

  let btn_offline_save = document.getElementById("btn-connection-offline-save");
  document.getElementById("setting_loan_period").onkeydown = function(ev) {
    if(ev.keyCode == 13) {
      if(btn_offline_save.disabled == false) btn_offline_save.click();
    } else {
      $("#btn-connection-offline-save").html('저장');
      btn_offline_save.disabled = false;
    }
  }

}

let btnsEV = function() {
  let inputs = document.getElementsByClassName("online_status");
  for(let i of inputs) {
    i.onclick = function() {
      setOnlineStatus(this.value);
    }
  }
}

let setDateHolidayBtnsEV = function() {
  let inputs = document.getElementsByClassName("setDateHolidayBtn");
  for(let i of inputs) {
    i.onclick = function() {
      if(i.classList.contains("holiday-fixDate") || i.classList.contains("holiday-excepted")) {
        holidaySave("excepted", this);
      } else {
        holidaySave("registered", this);
      }
    }
  }
}

let setDayHolidayBtnsEV = function() {
  let inputs = document.getElementsByClassName("setDayHolidayBtn");
  for(let i of inputs) {
    i.onclick = function() {
      holidaySave("fixDay", this);
    }
  }
}

let tabsEV = function() {
  let tabEl = document.querySelectorAll('button[data-bs-toggle="tab"]');
  for(let x of tabEl) {
    x.addEventListener('hidden.bs.tab', event => {
      console.log(event.target.dataset.item, "->", event.relatedTarget.dataset.item);
      let btn_conn_save = document.getElementById("btn-connection-"+ event.target.dataset.item +"-save");

      btn_conn_save.innerHTML = "저장";
      btn_conn_save.classList.remove("btn-success", "btn-danger");
      btn_conn_save.classList.add("btn-outline-primary");
      btn_conn_save.disabled = false;

      if(event.target.dataset.item != "online") {
        let btn_test = document.getElementById('btn-connection-test');
        btn_test.innerHTML = "테스트";
        btn_test.classList.remove("btn-outline-success", "btn-outline-danger");
        btn_test.classList.add("btn-outline-dark");
        btn_test.disabled = true;
      }

    })
  }
}

let pillsEV = function() {
  let pillEl = document.querySelectorAll('button[data-bs-toggle="pill"]');
  for(let x of pillEl) {
    x.addEventListener('hidden.bs.tab', event => {
      console.log(event.target.dataset.item, "->", event.relatedTarget.dataset.item);
      if(event.target.dataset.item != "connection") {
        let btn_save = document.getElementById("btn-" + event.target.dataset.item + "-save");
        btn_save.innerHTML = "저장";
        btn_save.classList.remove("btn-success", "btn-danger");
        btn_save.classList.add("btn-outline-primary");
        btn_save.disabled = false;
      }
    });

    x.addEventListener('show.bs.tab', event => {
      if(event.target.dataset.item != "connection") {
        let msg = {"action": event.target.dataset.item +"-open"};
        ipcRenderer.send(event.target.dataset.item, JSON.stringify(msg));
      }
    });
  }
}
