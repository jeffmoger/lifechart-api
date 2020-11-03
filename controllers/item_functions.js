const moment = require('moment');
const Items = require('../models/itemModel');

/*_________________________________________________________________________
Export Functions ________________________________________________________*/

function parseDateRange(date_range) {
  // Returns array of start and end date in milliseconds
  let arr, start, end
  if (date_range) {
      arr = date_range.split('_');
      end = Number(moment(arr[1]).startOf('day').add(1, 'days').format('x'));
      start = Number(moment(arr[0]).startOf('day').format('x'));
  } 
  return [start, end];
}

function countDays(start, end) {
  //Counts the distance between start and end, and returns integer
  let s = Number(moment(start).startOf('day').format('x'));
  let e = Number(moment(end).startOf('day').format('x'));
  return Number((e-s)/1000/60/60/24);
}

function bucketByDay(start, days, data) {
  //Groups all items in data into daily buckets
  let a = [];
  let count = 1;
  let currentDay = dateInMilli(start);

  while (count <= days) {
    a.push(buildObject(currentDay, addDay(currentDay), data));
    count++;
    currentDay = addDay(currentDay);
  }
  return a
}

function getData(userID, start, end, category){
  //Returns all items by userID, can be filtered by category
  if (category === 'all') {
    category = '';
  };
  const filter = {
    userID: userID,
    startTimeMillis: { $gte: start, $lte: end }}
  if (category) {
    filter.dataTypeName = `lifechart.${category}.item`
  }
  return Items.find(filter)
}

function filterByCategory(data, category) {
  if (data) {
    return data.filter((item) => item.dataTypeName == category);
  };
};

function groupData(data, categories, start, days) {
  const groupData = categories.map((category) => {
    let obj = {};
    obj.dataTypeName = category;
    let filteredData = filterByCategory(data, category);
    obj.dataSet = bucketByDay(start, days, filteredData);
    return obj
  })
  return groupData
}


/*_________________________________________________________________________
Internal Functions   ____________________________________________________*/


function filterDate(data, filterStart, filterEnd) {
  return data.filter((item) => item.startTimeMillis >= filterStart && item.startTimeMillis < filterEnd);
}

function simplifyData(data) {
  const itemsArray = [];
  data.map((item) => {
    const valueArray = item.value;
    const cats = [...new Set(valueArray.map(x => x.key))];
    cats.map((category, index) => {
      let value
      let checkVal = item.value[index].value;
      if (checkVal) {
        for (const val in checkVal) {
          value = checkVal[val]
        }
      }
      let itemObj = {
        key: category,
        date: item.startTimeMillis,
        value: value
      }
      itemsArray.push(itemObj)
    })
  })
  return itemsArray
}

function dateInMilli(date) {
  return Number(moment(date).startOf('day').format('x'));
}

function addDay(num) {
  let currentDay = moment(num);
  currentDay.add(1, 'days');
  return Number(currentDay.startOf('day').format('x'));
}

function buildObject(start, end, data) {
  const selected = filterDate(data, start, end);
  const simplifiedData = simplifyData(selected);
  const obj = {
    startTimeMillis: start,
    endTimeMillis: end,
    startDate: moment(start).format('MMM D, YYYY'),
    items: simplifiedData
  };
  return obj;
}

function validateDateRange(date_range) {
  date_range.length === 17 && console.log("Length: ok");
}



module.exports = {
  parseDateRange,
  countDays,
  getData,
  groupData
};