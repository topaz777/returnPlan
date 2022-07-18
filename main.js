const { app, BrowserWindow, ipcMain, screen, dialog, Tray, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const oracledb = require('oracledb')
const axios = require('axios')
const parser = require('fast-xml-parser');
const log = require('electron-log');
require("./updater/updater.js");

// Overriding console.log -> electron-log
console.log = log.log;

// naver api
const ncId = "YPZww2UjJjV6F3edLfYE";
const ncSecret = "6tex1gHf0T";
// openweather api - https://openweathermap.org/
const owKey = "4ba1b3bad28cbd59541014cb72a80d0e";

let configDirPath = "", extraResourcesDirPath = "", iconPath = "", oraClientPath = "";
let config = null;
let mainWindow = null, settingWindow = null;
let externalDisplay = null;
let tray = null;
let connectionSuccess = false;
let theme = "";

app.disableHardwareAcceleration();

process.env.ORA_SDTZ = 'UTC';

configDirPath = path.join(__dirname, app.isPackaged ? '/../config/' : './config/');
extraResourcesDirPath = path.join(__dirname, app.isPackaged ? '/../extraResources/' : './extraResources/');
iconPath = path.join(extraResourcesDirPath, 'tray.ico');
oraClientPath = path.join(extraResourcesDirPath, 'instantclient_11_2');

// log.transports.file.resolvePath = () => path.join(extraResourcesDirPath, 'logs/main.log');

let dateForLogName = new Date();
let logName = dateForLogName.getFullYear().toString() + (dateForLogName.getMonth()+1).toString() + dateForLogName.getDate().toString();
log.transports.file.resolvePath = () => path.join(extraResourcesDirPath, 'logs/'+ logName +'.log');
dateForLogName = null;

oracledb.initOracleClient({ libDir: oraClientPath });

// ----------------------------------------------------------------------------

//
let createSettingWindow = function(where) {
  settingWindow = new BrowserWindow({
    // x: 150,
    // y: 250,
    // frame: false,
    width: 660, //300,
    height: 730, //560,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  settingWindow.loadFile('./setting/setting.html');
  settingWindow.setMenuBarVisibility(false);
  if(!app.isPackaged) settingWindow.webContents.openDevTools()

  settingWindow.webContents.on('did-finish-load', () => {
    if(where != undefined) settingWindow.webContents.send('connection-moveTo', JSON.stringify({"where": where}));
  })

  settingWindow.on('closed', () => {
    settingWindow = null;
  });
}

//
let createMainWindow = function() {
  mainWindow = new BrowserWindow({
    kiosk: true,
    alwaysOnTop: true,
    // x: 0,
    // y: 0,
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile(config.theme);
  mainWindow.setMenuBarVisibility(false);
  if(!app.isPackaged) mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', () => {
    if(tray == null) setTray();
    getReturnPlanDate();

    mainWindow.webContents.send('owKey', JSON.stringify({"owKey": owKey}));
    getLoanBest();
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', () => {
    mainWindow = null;
    settingWindow = null;
  });
}

// ----------------------------------------------------------------------------

//
let setTray = function() {
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: '재실행', type: 'normal', click() {
      app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
      app.exit(0);
    } },
    { type: 'separator' },
    { label: '설정', type: 'normal', click() {
      if(settingWindow) {
        if(settingWindow.isVisible()) settingWindow.focus();
      } else {
        createSettingWindow();
      }
    } },
    { type: 'separator' },
    { label: '종료', type: 'normal', click() { app.quit(); } }
  ])
  tray.setToolTip('반납안내');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
}

// -----------------------------------------------------------------------------

function getHolidaysOffline() {
  let isTemplate = false;
  let dataBuffer;
  let holiday_temp = {};
  let dataJSON = "";

  try {
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'holiday.json'));
  } catch(e) {
    console.log("[getHolidaysOffline]", "No File - Template used");
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'template/holiday.json'));
    isTemplate = true;
  }

  dataJSON = dataBuffer.toString()

  if(dataJSON != "") {
    holiday_temp = JSON.parse(dataJSON);
  } else {
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'template/holiday.json'));
    dataJSON = dataBuffer.toString()
    holiday_temp = JSON.parse(dataJSON);
    isTemplate = true;
  }

  if(isTemplate) {
    fs.writeFile(path.join(configDirPath, 'holiday.json'), JSON.stringify(holiday_temp), 'utf8', function(error){
      if(error) {
        console.log(error);
      } else {
        console.log("Holiday-init");
      }
    });
  }

  return holiday_temp;
}

function getTheme() {
  let isTemplate = false;
  let dataBuffer = null;
  let theme_temp = {};
  let dataJSON = "";

  try {
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'theme.json'));
  } catch(e) {
    console.log("[getTheme]", "No File - Template used");
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'template/theme.json'));
    isTemplate = true;
  }

  dataJSON = dataBuffer.toString();

  if(dataJSON != "") {
    theme_temp = JSON.parse(dataJSON);
  } else {
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'template/theme.json'));
    dataJSON = dataBuffer.toString()
    theme_temp = JSON.parse(dataJSON);
    isTemplate = true;
  }

  if(isTemplate) {
    fs.writeFile(path.join(configDirPath, 'theme.json'), JSON.stringify(theme_temp), 'utf8', function(error){
      if(error) console.log(error);
    });
  }

  return theme_temp;
}

function getConfig() {
  let isTemplate = false;
  let dataBuffer = null;
  let config_temp = {};
  let dataJSON = "";

  try {
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'config.json'));
  } catch(e) {
    console.log("[getConfig]", "No File - Template used");
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'template/config.json'));
    isTemplate = true;
  }

  dataJSON = dataBuffer.toString();

  if(dataJSON != "") {
    config_temp = JSON.parse(dataJSON);
  } else {
    dataBuffer = fs.readFileSync(path.join(configDirPath, 'template/config.json'));
    dataJSON = dataBuffer.toString()
    config_temp = JSON.parse(dataJSON);
    isTemplate = true;
  }

  if(isTemplate) {
    fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(config_temp), 'utf8', function(error){
      if(error) {
        console.log(error);
      } else {
        console.log("Config-init");
      }
    });
  }

  return config_temp;
}

let checkDbConfig = function() {
  let loadSetting = false;

  if(config.mode == "online") {
    if(typeof config.user == "undefined" || config.user == "undefined" || config.user == "" || config.user == null) loadSetting = true;

    if(typeof config.password == "undefined" || config.password == "undefined" || config.password == "" || config.password == null) loadSetting = true;

    if(typeof config.connectString == "undefined" || config.connectString == "undefined" || config.connectString == "" || config.connectString == null) {
      loadSetting = true;
    } else {
      if(config.connectString.indexOf(":") < 0) loadSetting = true;
      if(config.connectString.indexOf("/") < 0) loadSetting = true;
      if(config.connectString.indexOf(":") >= 0 && config.connectString.indexOf("/") >= 0) {
        let arr1 = config.connectString.split(":");
        if(arr1[0].length < 4) loadSetting = true;  // ip
        if(arr1[1].length < 3) loadSetting = true;  // port + sid

        let arr2 = arr1[1].split("/");
        if(arr2[0].length < 1) loadSetting = true;  // port
        if(arr2[1].length < 1) loadSetting = true;  // sid
      }
    }
  }

  // if(settingWindow) settingWindow.webContents.send('config-check-result', JSON.stringify({"isSuccess": !loadSetting}));

  return !loadSetting;
}

let checkConfigs = function() {
  config = getConfig();

  switch (config.mode) {
    case "online":
      if(!checkDbConfig()) return "connection-tab-btn";

      if(typeof config.loan_period  == "undefined" || config.loan_period  == "undefined" || config.loan_period  == "" || config.loan_period  == null) return "grade-tab-btn";
      if(typeof config.shelf_loc_code  == "undefined" || config.shelf_loc_code  == "undefined" || config.shelf_loc_code  == "" || config.shelf_loc_code  == null) return "shelf-tab-btn";
      if(typeof config.manage_code  == "undefined" || config.manage_code  == "undefined" || config.manage_code  == "" || config.manage_code  == null) return "manage_code-tab-btn";

      break;

    case "offline":
      if(typeof config.loan_period  == "undefined" || config.loan_period  == "undefined" || config.loan_period  == "" || config.loan_period  == null) return "connection_offline_btn";

      let data = getTheme().themes;
      for(let x of data) if(config.theme == x.filename) if(x.isOnline) return "theme-tab-btn";

      break;

    default:
      return "connection-tab-btn";

      break;
  }

  if(typeof config.display  == "undefined" || config.display  == "undefined" || config.display  == "" || config.display  == null) console.log("Set default display");

  if(typeof config.theme  == "undefined" || config.theme  == "undefined" || config.theme  == "" || config.theme  == null) console.log("Set default theme");

  return "success";
}

// -----------------------------------------------------------------------------

function connectionSave(settingInfo) {
  console.log("[Before-Connection-Save]", config);

  if(settingInfo.mode == "offline") {
    config.loan_period = settingInfo.loan_period;
  } else {
    config.user = settingInfo.user;
    config.password = settingInfo.password;
    config.connectString = settingInfo.connectString;
  }

  config.mode = settingInfo.mode;

  fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(config), 'utf8', function(error){
    if(error) console.log(error);

    connectionSuccess = false;

    if(settingWindow) settingWindow.webContents.send('connection-save-result', JSON.stringify({"isSuccess": error ? false : true, "mode": settingInfo.mode}));
  });

  console.log("[After-Connection-Save]", config);
}

function gradeSave(settingInfo) {
  console.log("[Before-Grade-Save]", config);

  config.loan_period = settingInfo.loan_period;
  config.user_class_code = settingInfo.code;

  fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(config), 'utf8', function(error){
    if(error) console.log(error);
    if(settingWindow) settingWindow.webContents.send('grade-save-result', JSON.stringify({"isSuccess": error ? false : true}));
  });

  console.log("[After-Grade-Save]", config);
}

function shelfSave(settingInfo) {
  console.log("[Before-Shelf-Save]", config);

  config.shelf_loc_code = settingInfo.code;

  fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(config), 'utf8', function(error){
    if(error) console.log(error);
    if(settingWindow) settingWindow.webContents.send('shelf-save-result', JSON.stringify({"isSuccess": error ? false : true}));
  });

  console.log("[After-Shelf-Save]", config);
}

function manage_codeSave(settingInfo) {
  console.log("[Before-ManageCode-Save]", config);

  config.manage_code = settingInfo.manage_code;

  fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(config), 'utf8', function(error){
    if(error) console.log(error);
    if(settingWindow) settingWindow.webContents.send('manage_code-save-result', JSON.stringify({"isSuccess": error ? false : true}));
  });

  console.log("[After-ManageCode-Save]", config);
}

function getFixDate(yyyy, fixDays) {
  let fixDate = {"year": Number(yyyy)};
  for(fixDay of fixDays) {
    let date = new Date(yyyy + "/01/01");
    let firstFixDate = 0;
    while(firstFixDate == 0) {
      if(date.getDay() == fixDay) firstFixDate = date.getDate();
      if(firstFixDate == 0) date.setDate(date.getDate() + 1);
    }
    while(date.getFullYear() == yyyy) {
      if(typeof fixDate[date.getMonth()+1] == "undefined") fixDate[date.getMonth()+1] = [];
      fixDate[date.getMonth()+1].push(date.getDate());
      fixDate[date.getMonth()+1].sort(function(a, b){return a - b});
      date.setDate(date.getDate() + 7);
    }
  }
  return fixDate;
}

function holidaySave(settingInfo) {
  let holidayInfo = getHolidaysOffline();
  let result = {"type": settingInfo.type, "target": settingInfo.date};

  if(typeof settingInfo.type != "undefined" && settingInfo.type == "fixDay") {
    result.target = settingInfo.fixDay;

    let isHit = false;
    let fixDayArr = [];
    let fixDay = Number(settingInfo.fixDay);

    if(typeof holidayInfo.fixDay[settingInfo.year] == "undefined") holidayInfo.fixDay[settingInfo.year] = [];
    fixDayArr = holidayInfo.fixDay[settingInfo.year];

    if(!fixDayArr.includes(fixDay)) {
      fixDayArr.push(fixDay);
      fixDayArr.sort(function(a, b){return a - b});
      result.action = "add";
    } else {
      fixDayArr.splice(fixDayArr.indexOf(fixDay), 1);
      result.action = "remove";
    }

    for(let item of holidayInfo.fixDate) if(item.year == settingInfo.year) holidayInfo.fixDate.splice(holidayInfo.fixDate.indexOf(item), 1);
    if(holidayInfo.fixDay[settingInfo.year].length > 0) holidayInfo.fixDate.push(getFixDate(settingInfo.year, holidayInfo.fixDay[settingInfo.year]));
  }

  if(typeof settingInfo.type != "undefined" && settingInfo.type == "registered") {
    let isHit = false;
    for(let item of holidayInfo.registered) {
      if(item.year == settingInfo.year) {
        if(typeof item[settingInfo.month] == "undefined") item[settingInfo.month] = [];
        let dateArr = item[settingInfo.month];
        let date = Number(settingInfo.date);

        if(!dateArr.includes(date)) {
          dateArr.push(date);
          dateArr.sort(function(a, b){return a - b});
          result.action = "add";
        } else {
          dateArr.splice(dateArr.indexOf(date), 1);
          result.action = "remove";
        }
        isHit = true;
      }
    }

    if(!isHit) {
      let item = {"year": Number(settingInfo.year)};
      item[settingInfo.month] = [];
      item[settingInfo.month].push(Number(settingInfo.date));
      holidayInfo.registered.push(item);
      result.action = "add";
    }
  }

  if(typeof settingInfo.type != "undefined" && settingInfo.type == "excepted") {
    let isHit = false;
    for(let item of holidayInfo.excepted) {
      if(item.year == settingInfo.year) {
        if(typeof item[settingInfo.month] == "undefined") item[settingInfo.month] = [];
        let dateArr = item[settingInfo.month];
        let date = Number(settingInfo.date);

        if(!dateArr.includes(date)) {
          for(let fixDate of holidayInfo.fixDate) {
            if(fixDate.year == settingInfo.year) {
              if(fixDate[settingInfo.month].includes(date)) {
                dateArr.push(date);
                dateArr.sort(function(a, b){return a - b});
                result.action = "add";
              }
            }
          }
        } else {
          dateArr.splice(dateArr.indexOf(date), 1);
          result.action = "remove";
        }
        isHit = true;
      }
    }

    if(!isHit) {
      let item = {"year": Number(settingInfo.year)};
      item[settingInfo.month] = [];
      item[settingInfo.month].push(Number(settingInfo.date));
      holidayInfo.excepted.push(item);
      result.action = "add";
    }
  }

  fs.writeFile(path.join(configDirPath, 'holiday.json'), JSON.stringify(holidayInfo), 'utf8', function(error) {
    if(error) console.log(error);
    result.isSuccess = error ? false : true;
    if(settingWindow) settingWindow.webContents.send('holiday-save-result', JSON.stringify(result));
  });
}

function themeSave(settingInfo) {
  console.log("[Before-Theme-Save]", config);

  config.theme = settingInfo.name;

  fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(config), 'utf8', function(error){
    if(error) console.log(error);
    if(settingWindow) settingWindow.webContents.send('theme-save-result', JSON.stringify({"isSuccess": error ? false : true}));
  });

  console.log("[After-Theme-Save]", config);
}

// -----------------------------------------------------------------------------

let analyzeHoliday = async function() {
  let mergingArr = [];

  if(config.mode == "offline") {
    let holidays = getHolidaysOffline();

    for(let fixDate of holidays.fixDate) {
      let isHit = false;

      for(let registered of holidays.registered) {
        if(fixDate.year == registered.year) {
          for(let i=1; i<=12; i++) {
            let obj = { YEAR: fixDate.year, MONTH: i};

            if(typeof fixDate[i] == "undefined") {
              if(typeof registered[i] != "undefined") {
                obj.DAYS = registered[i].toString();
                mergingArr.push(obj);
              }
            } else {
              if(typeof registered[i] == "undefined") {
                obj.DAYS = fixDate[i].toString();
                mergingArr.push(obj);
              } else {
                obj.DAYS = fixDate[i].concat(registered[i]).toString();
                mergingArr.push(obj);
              }
            }
          }
          isHit = true;
        }
      }

      if(!isHit) {
        for(let i=1; i<=12; i++) {
          let obj = { YEAR: fixDate.year, MONTH: i};

          if(typeof fixDate[i] != "undefined") {
            obj.DAYS = fixDate[i].toString();
            mergingArr.push(obj);
          }
        }
      }
    }

    for(let registered of holidays.registered) {
      let isHit = false;

      for(let i of mergingArr) if(registered.year == i.YEAR) isHit = true;

      if(!isHit) {
        for(let i=1; i<=12; i++) {
          let obj = { YEAR: registered.year, MONTH: i };

          if(typeof registered[i] != "undefined") {
            obj.DAYS = registered[i].toString();
            mergingArr.push(obj);
          }
        }
      }
    }
  } else {
    mergingArr = await getHolidaysOnline();
  }

  return mergingArr;
}

async function getReturnPlanDate() {
  let isSuccess = false;
  let date = new Date();
  let holidays = await analyzeHoliday();

  date.setDate(date.getDate() + Number(config.loan_period));

  if(holidays.length > 0) {
    for(let item of holidays) {
      if(item.YEAR == date.getFullYear() && item.MONTH == date.getMonth() +1) {
        let days = item.DAYS.split(",");
        days.sort(function(a, b){return a - b}).find(function(day){
          if(day.trim() == date.getDate()) {
            date.setDate(date.getDate() + 1);
          }
        });
      }
    }
  }

  let return_plan_date = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    date: date.getDate(),
    day: date.getDay(),
    loan_period: config.loan_period
  };

  if(mainWindow) mainWindow.webContents.send('return_plan_date', JSON.stringify(return_plan_date));
  isSuccess = true;

  if(mainWindow) mainWindow.webContents.send('holiday', JSON.stringify(holidays));

  return isSuccess;
}

// ----------------------------------------------------------------------------

app.whenReady().then(() => {
  const displays = screen.getAllDisplays();

  if(displays.length < 2) {
    console.log("No externalDisplay exist.");
    dialog.showErrorBox("오류", "연결된 외장모니터가 없습니다.");
    app.quit();
    // createMainWindow();
  } else {
    externalDisplay = displays.find((display) => {
      return display.bounds.x !== 0 || display.bounds.y !== 0
    })

    let config_result = checkConfigs();

    if(config_result == "success") {
      if(config.mode == "online") {
        connectionTest().then(result => {
          connectionSuccess = result;
          if(result) {
            createMainWindow();
          } else {
            createSettingWindow("connection-tab-btn");
          }
        });
      } else {
        createMainWindow();
      }
    } else {
      createSettingWindow(config_result);
    }
  }

  app.on('activate', function () {
    // if(BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })

  screen.on('display-added', function (display) {
    console.log("[EV] display-added");
    // console.log(display);
  })

  screen.on('display-removed', function (display) {
    console.log("[EV] display-removed");
    // console.log(display);
  })

  screen.on('display-metrics-changed', function (display) {
    console.log("[EV] display-metrics-changed");
    // console.log(display);
  })
})

app.on('window-all-closed', function () {
  if(process.platform !== 'darwin') app.quit()
  // if(tray != null) if(!tray.isDestroyed()) tray.destroy()
})

// Oracle ----------------------------------------------------------------------------

async function connectionTest() {
  let isSuccess = false;
  console.log("[connection.Test Start]");
  let connection;

  try {
    connection = await oracledb.getConnection(config);

    console.log("[connection.Test Success]");

    if(settingWindow) settingWindow.webContents.send('connection-test-result', JSON.stringify({"isSuccess": true}));

    isSuccess = true;
  } catch (err) {
    console.log("[connection.Test]");
    console.error(err);

    if(settingWindow) {
      if(settingWindow) settingWindow.webContents.send('connection-test-result', JSON.stringify({"isSuccess": false}));
      console.log("[connection-test-result Send]");
    } else {
      // createSettingWindow();
    }
  } finally {
    if(connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
  console.log("[connection.Test End]");
  return isSuccess;
}

// -
async function getAllGrades() {
  let isSuccess = false;
  let connection;

  try {
    let sql, binds, options, result;
    connection = await oracledb.getConnection(config);
    sql = "SELECT REC_KEY, CODE, DESCRIPTION, LOAN_PERIOD FROM CD_CODE_TBL WHERE CLASS = 31 AND (LOAN_PERIOD IS NOT NULL AND LOAN_PERIOD != 0) ORDER BY CODE";
    binds = {};
    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    };
    result = await connection.execute(sql, binds, options);
    // console.dir(result.rows, { depth: null });
    // console.log(result.rows);

    result.rows.forEach(function(grade, i){
      let isChecked = false;
      if(grade.CODE == config.user_class_code) isChecked = true;
      grade.isChecked = isChecked;
    });

    if(settingWindow) settingWindow.webContents.send('grades', JSON.stringify(result.rows));
    isSuccess = true;
  } catch (err) {
    console.log("[get.AllGrades]");
    console.error(err);
  } finally {
    if(connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
  return isSuccess;
}

// -
async function getAllShelves() {
  let isSuccess = false;
  let connection;

  try {
    let sql, binds, options, result;
    connection = await oracledb.getConnection(config);
    sql = "SELECT REC_KEY, CODE, DESCRIPTION FROM CD_CODE_TBL WHERE CLASS = 19 AND (CODE IS NOT NULL AND CODE != ' ') ORDER BY CODE";
    binds = {};
    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    };
    result = await connection.execute(sql, binds, options);
    // console.dir(result.rows, { depth: null });
    // console.log(result.rows);

    result.rows.forEach(function(shelf, i){
      let isChecked = false;
      if(shelf.CODE == config.shelf_loc_code) isChecked = true;
      shelf.isChecked = isChecked;
    });

    if(settingWindow) settingWindow.webContents.send('shelves', JSON.stringify(result.rows));
    isSuccess = true;
  } catch (err) {
    console.log("[get.AllShelves]");
    console.error(err);
  } finally {
    if(connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
  return isSuccess;
}

// -
async function getAllManage_codes() {
  let isSuccess = false;
  let connection;

  try {
    let sql, binds, options, result;
    connection = await oracledb.getConnection(config);
    sql = "SELECT REC_KEY, MANAGE_CODE, LIB_NAME, LIB_CODE FROM MN_LIBINFO2_TBL ORDER BY REC_KEY";
    binds = {};
    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    };
    result = await connection.execute(sql, binds, options);
    // console.dir(result.rows, { depth: null });
    // console.log(result.rows);

    result.rows.forEach(function(manage_code, i){
      let isChecked = false;
      if(manage_code.MANAGE_CODE == config.manage_code) isChecked = true;
      manage_code.isChecked = isChecked;
    });

    if(settingWindow) settingWindow.webContents.send('manage_codes', JSON.stringify(result.rows));
    isSuccess = true;
  } catch (err) {
    console.log("[get.AllManage_code]");
    console.error(err);
  } finally {
    if(connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
  return isSuccess;
}

// -
async function getHolidaysOnline() {
  let holidays, connection;
  let date = new Date();

  try {
    let sql, binds, options, result;
    connection = await oracledb.getConnection(config);

    // sql = "SELECT YEAR, MONTH, DAYS FROM MN_LIB_HOLIDAY_TBL WHERE YEAR = :year AND MONTH = :month AND MANAGE_CODE = :manage_code";
    sql = "SELECT YEAR, MONTH, DAYS FROM MN_LIB_HOLIDAY_TBL WHERE YEAR = :year AND MANAGE_CODE = :manage_code";
    binds = {
      year: date.getFullYear(),
      // month: date.getMonth() + 1,
      manage_code: config.manage_code
    };
    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    };
    result = await connection.execute(sql, binds, options);
    holidays = result.rows;
  } catch (err) {
    console.log("[get.ReturnPlanDate]");
    console.error(err);
  } finally {
    if(connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }

  return holidays;
}

// - 3 month
async function getLoanBest() {
  let isSuccess = false;
  let connection;
  let date = new Date();

  try {
    let sql, binds, options, result;
    connection = await oracledb.getConnection(config);
    sql = "SELECT RS.*, IB.TITLE, IB.AUTHOR, IB.PUBLISHER, IB.PUB_YEAR FROM (SELECT LS.CNT, BB.* FROM (SELECT BOOK_KEY, COUNT(BOOK_KEY) CNT FROM LS_WORK_T01 WHERE TO_CHAR(LOAN_DATE, 'YYYYMMDD') BETWEEN :startDate AND :endDate AND SHELF_LOC_CODE = :shelf_loc_code GROUP BY BOOK_KEY ORDER BY CNT DESC) LS LEFT JOIN (SELECT REC_KEY, SPECIES_KEY, EA_ISBN, REG_NO, WORKING_STATUS, SEPARATE_SHELF_CODE, CLASS_NO, BOOK_CODE, VOL_CODE, COPY_CODE FROM BO_BOOK_TBL) BB ON LS.BOOK_KEY = BB.REC_KEY WHERE EA_ISBN IS NOT NULL) RS LEFT JOIN (SELECT REC_KEY, TITLE, AUTHOR, PUBLISHER, PUB_YEAR FROM IDX_BO_TBL) IB ON RS.SPECIES_KEY = IB.REC_KEY WHERE ROWNUM < 5";
    // sql = "SELECT BB.EA_ISBN, BB.REG_NO, BB.WORKING_STATUS, BB.SEPARATE_SHELF_CODE, BB.CLASS_NO, BB.BOOK_CODE, BB.VOL_CODE, BB.COPY_CODE, IB.TITLE, IB.AUTHOR, IB.PUBLISHER, IB.PUB_YEAR FROM (SELECT SPECIES_KEY, EA_ISBN, REG_NO, WORKING_STATUS, SEPARATE_SHELF_CODE, CLASS_NO, BOOK_CODE, VOL_CODE, COPY_CODE FROM BO_BOOK_TBL WHERE REC_KEY IN (SELECT BOOK_KEY FROM (SELECT BOOK_KEY, COUNT(BOOK_KEY) CNT FROM LS_WORK_T01 WHERE TO_CHAR(LOAN_DATE, 'YYYYMMDD') BETWEEN :startDate AND :endDate AND SHELF_LOC_CODE = :shelf_loc_code GROUP BY BOOK_KEY ORDER BY CNT DESC) WHERE ROWNUM < 30) AND EA_ISBN IS NOT NULL AND ROWNUM < 11) BB LEFT JOIN (SELECT REC_KEY, TITLE, AUTHOR, PUBLISHER, PUB_YEAR FROM IDX_BO_TBL) IB ON BB.SPECIES_KEY = IB.REC_KEY";
    binds = {
      startDate: date.getFullYear().toString() + (date.getMonth()-2).toString().padStart(2,0) + date.getDate().toString().padStart(2,0),
      endDate: date.getFullYear().toString() + (date.getMonth()+1).toString().padStart(2,0) + date.getDate().toString().padStart(2,0),
      shelf_loc_code: config.shelf_loc_code
    };
    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    };
    result = await connection.execute(sql, binds, options);
    // console.log(result.rows);

    let getLoanBest = [];

    if(result.rows.length > 0) {
      for(let obj of result.rows) {
        let bookInfo = await getBookImage(obj.EA_ISBN);

        let separate_shelf_code = obj.SEPARATE_SHELF_CODE == null ? "" : obj.SEPARATE_SHELF_CODE + " ";
        let volcode = obj.VOL_CODE == null ? "" : "-" + obj.VOL_CODE;
        let copycode = obj.COPY_CODE == null ? "" : "=" + obj.COPY_CODE;
        let callno = separate_shelf_code + obj.CLASS_NO + "-" + obj.BOOK_CODE + volcode + copycode;
        let image = bookInfo.image;
        let link = await getShorturl(bookInfo.link);

        let row = {
          count: obj.CNT,
          reg_no: obj.REG_NO,
          isbn: obj.EA_ISBN,
          working_status: obj.WORKING_STATUS,
          title: obj.TITLE,
          author: obj.AUTHOR,
          publisher: obj.PUBLISHER,
          pub_year: obj.PUB_YEAR,
          callno: callno,
          image: image,
          link: link
        };

        getLoanBest.push(row);
      }
    }

    if(mainWindow) mainWindow.webContents.send('getLoanBest', JSON.stringify(getLoanBest));
    isSuccess = true;
  } catch (err) {
    console.log("[get.LoanBest]");
    console.error(err);
  } finally {
    if(connection) {
      try {
        await connection.close();

        getNewBook();
      } catch (err) {
        console.error(err);
      }
    }
  }
  return isSuccess;
}

// -
async function getNewBook() {
  let isSuccess = false;
  let connection;
  let date = new Date();

  try {
    let sql, binds, options, result;
    connection = await oracledb.getConnection(config);
    sql = "SELECT BB.EA_ISBN, BB.REG_NO, BB.WORKING_STATUS, BB.SHELF_DATE, BB.SEPARATE_SHELF_CODE, BB.CLASS_NO, BB.BOOK_CODE, BB.VOL_CODE, BB.COPY_CODE, IB.TITLE, IB.AUTHOR, IB.PUBLISHER, IB.PUB_YEAR FROM (SELECT SPECIES_KEY, EA_ISBN, REG_NO, WORKING_STATUS, SEPARATE_SHELF_CODE, CLASS_NO, BOOK_CODE, VOL_CODE, COPY_CODE, TO_CHAR(SHELF_DATE, 'YYYY/MM/DD') SHELF_DATE FROM BO_BOOK_TBL WHERE SHELF_LOC_CODE = :shelf_loc_code AND EA_ISBN IS NOT NULL AND SHELF_DATE IS NOT NULL ORDER BY SHELF_DATE DESC) BB LEFT JOIN (SELECT REC_KEY, TITLE, AUTHOR, PUBLISHER, PUB_YEAR FROM IDX_BO_TBL) IB ON BB.SPECIES_KEY = IB.REC_KEY WHERE ROWNUM < 5";
    binds = {
      shelf_loc_code: config.shelf_loc_code
    };
    options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    };
    result = await connection.execute(sql, binds, options);
    // console.log(result.rows);

    let getNewBook = [];

    if(result.rows.length > 0) {
      for(let obj of result.rows) {
        let bookInfo = await getBookImage(obj.EA_ISBN);

        let separate_shelf_code = obj.SEPARATE_SHELF_CODE == null ? "" : obj.SEPARATE_SHELF_CODE + " ";
        let volcode = obj.VOL_CODE == null ? "" : "-" + obj.VOL_CODE;
        let copycode = obj.COPY_CODE == null ? "" : "=" + obj.COPY_CODE;
        let callno = separate_shelf_code + obj.CLASS_NO + "-" + obj.BOOK_CODE + volcode + copycode;
        let image = bookInfo.image;
        let link = await getShorturl(bookInfo.link);

        let row = {
          shelf_date: obj.SHELF_DATE,
          reg_no: obj.REG_NO,
          isbn: obj.EA_ISBN,
          working_status: obj.WORKING_STATUS,
          title: obj.TITLE,
          author: obj.AUTHOR,
          publisher: obj.PUBLISHER,
          pub_year: obj.PUB_YEAR,
          callno: callno,
          image: image,
          link: link
        };

        getNewBook.push(row);
      }
    }

    if(mainWindow) mainWindow.webContents.send('getNewBook', JSON.stringify(getNewBook));
    isSuccess = true;
  } catch (err) {
    console.log("[get.NewBook]");
    console.error(err);
  } finally {
    if(connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
  return isSuccess;
}

// Ipc ----------------------------------------------------------------------------

ipcMain.on('setting', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[setting]", responseData);
  if(responseData.action == "setting-close") {
    settingWindow.destroy();
  } else if(responseData.action == "setting-relaunch") {
    app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
    app.exit(0);
  } else if(responseData.action == "holiday-open") {
    let holidays = getHolidaysOffline();
    if(settingWindow) settingWindow.webContents.send('holiday-open', JSON.stringify(holidays));
  } else if(responseData.action == "holiday-save") {
    holidaySave(responseData.holiday);
  }
});

ipcMain.on('connection', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[connection]", responseData);

  if(responseData.action == "connection-open") {
    // config = getConfig();
    if(settingWindow) settingWindow.webContents.send('connection-open', JSON.stringify(config));
  } else if(responseData.action == "connection-save") {
    connectionSave(responseData.settingInfo);
  } else if(responseData.action == "connection-test") {
    connectionTest().then(result => { connectionSuccess = result; });
  }
});

ipcMain.on('grade', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[grade]", responseData);

  if(responseData.action == "grade-open") {
    if(connectionSuccess) {
      getAllGrades();
    } else {
      if(settingWindow) settingWindow.webContents.send('connection-fail', JSON.stringify({"item": "grade"}));
    }
  } else if(responseData.action == "grade-save") {
    gradeSave(responseData.grade);
  }
});

ipcMain.on('shelf', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[shelf]", responseData);

  if(responseData.action == "shelf-open") {
    if(connectionSuccess) {
      getAllShelves();
    } else {
      if(settingWindow) settingWindow.webContents.send('connection-fail', JSON.stringify({"item": "shelf"}));
    }
  } else if(responseData.action == "shelf-save") {
    shelfSave(responseData.shelf);
  }
});

ipcMain.on('manage_code', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[manage_code]", responseData);

  if(responseData.action == "manage_code-open") {
    if(connectionSuccess) {
      getAllManage_codes();
    } else {
      if(settingWindow) settingWindow.webContents.send('connection-fail', JSON.stringify({"item": "manage_code"}));
    }
  } else if(responseData.action == "manage_code-save") {
    manage_codeSave(responseData.manage_code);
  }
});

ipcMain.on('display', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[display]", responseData);

  if(responseData.action == "display-open") {
    if(settingWindow) settingWindow.webContents.send('displays', JSON.stringify(screen.getAllDisplays()));


  } else if(responseData.action == "display-save") {
    // displaySave(responseData.display);
  }
});

ipcMain.on('theme', function (event, arg) {
  let responseData = JSON.parse(arg);
  console.log("[theme]", responseData);

  if(responseData.action == "theme-open") {
    let data = getTheme();
    data.selected = config.theme;

    console.log("[Before Send themes]", responseData);
    if(settingWindow) settingWindow.webContents.send('themes', JSON.stringify(data));

  } else if(responseData.action == "theme-save") {
    themeSave(responseData.theme);
  }
});

// ----------------------------------------------------------------------------

async function getBookImage(isbn) {
  if(isbn == null) {

  }
  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/book_adv.xml', {
      params: {
        "d_isbn": isbn
      },
      headers: {
          "X-Naver-Client-Id": ncId,
          "X-Naver-Client-Secret": ncSecret
      }
    })
    let result = parser.parse(response.data);
    // console.log(result.item);

    let resultObj = {
      "image": result.rss.channel.item.image,
      "link": result.rss.channel.item.link
    }
    return resultObj;
  } catch(error) {
    console.log("[get.BookImage]");
    console.log(error);
  }
}

async function getShorturl(url) {
  try {
    const response = await axios.get('https://openapi.naver.com/v1/util/shorturl', {
      params: {
        "url": url
      },
      headers: {
          "X-Naver-Client-Id": ncId,
          "X-Naver-Client-Secret": ncSecret
      }
    })
    return response.data.result.url;
  } catch(error) {
    console.log("[get.Shorturl]");
    console.log(error);
  }
}
