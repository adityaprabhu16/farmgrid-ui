//const old_sensor_url = "https://microsight.000webhostapp.com/api/yard/read_all.php";
const sensor_url = "https://microsight.000webhostapp.com/api/garden/read_all.php";
const actuator_url = "https://microsight.000webhostapp.com/api/pump/read_all.php?id=1";
let timestamp = [];
let actuator_timestamp = [];
let moist_res = []; let moist_cap = []; let moist_light = []; let moist_distance = []; let moist_pump=[];  //1D array of JSON data
let pairs_cap = []; let pairs_res = []; let pairs_light = []; let pairs_distance = []; let pairs_pump=[];  //2D array of ordered pairs
let pair_cap = []; let pair_res = []; let pair_light = []; let pair_distance = []; let pair_pump=[];  //1D array of one pair of data
let multiGraph = null;
let uniGraph = null;
let pumpGraph = null;
let sensor_duration = 5000;                    //time between sensor chart updates
let actuator_duration = 5000;                   //time between actuator chart updates
let offset = 1;                         //offset gets greater => we're going backwards
let frontIdx = 49;                      //number of datapoints to be rendered.
let updateOnLoad = true;        
let currTime;                          //FIXME: get rid of this when pumpGraph has it's own updatable timestamps      
let IDPrevious = 0;       

/*
On load of the web browser, load initial data (i.e. the most recent 50 data-points)
*/
if(updateOnLoad == true){
    window.onload = function() {
        chartInitEntry();
        loadIconData();
    };
    updateOnLoad = false;
}

/*
Once initial chart setup done, update the chart whenever there's a new entry
*/
window.setInterval( function(){ 
    frontIdx += 1;
    chartSensorEntry();
    loadIconData();
    }, 
    sensor_duration
);

window.setInterval(function(){
    chartActuatorEntry();
    }, 
    actuator_duration
);

/*
Load the most recent data for the icons.
*/
async function loadIconData(){
    $.getJSON(sensor_url, function(data) {
        let backIdx = Object.keys(data['garden']).length-1;
        var resistive= parseFloat(data['garden'][backIdx]['moist_res']);
        var capacitive= parseFloat(data['garden'][backIdx]['moist_cap']);
        var distance = data['garden'][backIdx]['distance'];
        var light = parseFloat(data['garden'][backIdx]['light']);
        document.getElementById("moist_res").innerHTML = "<img src = 'images/moist_res.png' height=\"60px\" width=\"60px\" style='vertical-align: middle' />  " +resistive+"%";
        document.getElementById("moist_cap").innerHTML = "<img src = 'images/moist_cap.png' height=\"60px\" width=\"60px\" style='vertical-align: middle' />  "+capacitive+"%";
        document.getElementById("distance").innerHTML = "<img src = 'images/distance.png' height = \"60px\" width=\"60px\" style='vertical-align: middle' /> "+distance+"cm";
        document.getElementById("light").innerHTML = "<img src = 'images/light.png' height = \"60px\" width = \"60px\" style = 'vertical-align: middle' />"+light;
        console.log(data['garden'][backIdx]['moist_res']);
    });

    $.getJSON(actuator_url, function(actuator_data){
        let actuator_backIdx = Object.keys(actuator_data['pump']).length-1;
        var pumpStr = actuator_data['pump'][actuator_backIdx]['status'];
        let pumpTxt = document.getElementById('pump-text');
        if(pumpStr === "on") {
            pumpTxt.value = "ON";
        }
        else if (pumpStr == "off"){
            pumpTxt.value = "OFF";
        }
    });
}

/*
Chart the 50 datapoints read from the database
*/
async function chartInitEntry() {
    await readAPI();                //get the data
    let multiContext = document.getElementById("sensorchart").getContext('2d');
    let uniContext = document.getElementById("levelchart").getContext('2d');
    let pumpContext = document.getElementById("pumpchart").getContext('2d');

    uniGraph = new Chart(uniContext, chartUniGraph());
    multiGraph = new Chart(multiContext, chartMultiGraph());
    pumpGraph = new Chart(pumpContext, chartPumpGraph());

    multiGraph.data.labels = timestamp;
    multiGraph.data.datasets[0].data = pairs_res;
    multiGraph.data.datasets[1].data = pairs_cap;
    multiGraph.data.datasets[2].data = pairs_light;
    
    uniGraph.data.labels = timestamp;
    uniGraph.data.datasets[0].data = pairs_distance;

    pumpGraph.data.labels = timestamp;
    pumpGraph.data.datasets[0].data = pairs_pump;
    
    multiGraph.update();
    uniGraph.update();
    pumpGraph.update();
}


/*
Read the most recent 50 datapoints from the database
*/
async function readAPI() {
    const response = await fetch(sensor_url);
    const data = await response.json();
    const actuator_response = await fetch(actuator_url);
    const actuator_data = await actuator_response.json();

    let backIdx = Object.keys(data['garden']).length-offset;
    let actuator_backIdx = Object.keys(actuator_data['pump']).length-1;
    let pumpState = 0;
    let pumpStr = (actuator_data['pump'][actuator_backIdx]['status']);
    
    for(let count = 0; count <= frontIdx; count++){
        moist_res.push(parseFloat(data['garden'][backIdx]['moist_res']));
        moist_cap.push(parseFloat(data['garden'][backIdx]['moist_cap']));
        moist_distance.push(parseFloat(data['garden'][backIdx]['distance']));
        moist_light.push(parseFloat(data['garden'][backIdx]['light']));
        timestamp.push((data['garden'][backIdx]['timestamp']).slice(5));

        pumpStr = (actuator_data['pump'][actuator_backIdx]['status']);
        if(pumpStr === "off"){ pumpState = 0; }
        else if (pumpStr === "on"){ pumpState = 1;}
        else { pumpState = 0; }

        moist_pump.push(pumpState);

        offset += 1;
        backIdx = Object.keys(data['garden']).length-offset;
    }

    let i = 0;
    moist_res.forEach(function(y){
        if(i < 50){
            pairs_res.push([timestamp[i], y]);
            i++;
        }
    })
    i=0;
    moist_cap.forEach(function(y){
        if(i < 50){
            pairs_cap.push([timestamp[i], y]);
            i++;
        }
    })
    i=0;
    moist_distance.forEach(function(y){
        if(i < 50){
            pairs_distance.push([timestamp[i], y]);
            i++;
        }
    })
    i=0;
    moist_light.forEach(function(y){
        if(i < 50){
            pairs_light.push([timestamp[i], y]);
            i++;
        }
    })
    i=0;
    moist_pump.forEach(function(y){
        if(i < 50){
            pairs_pump.push([timestamp[i], y]);
        }
        i++;
    })

    pairs_res = pairs_res.reverse();                //reverse the data from (moist-recent -> least recent) to (least-recent -> most-recent)
    pairs_cap = pairs_cap.reverse();
    pairs_distance = pairs_distance.reverse();
    pairs_light = pairs_light.reverse();
    pairs_pump = pairs_pump.reverse();
    timestamp = timestamp.reverse();
}

async function chartSensorEntry() {
    const response = await fetch(sensor_url);
    const data = await response.json();
    offset = 1;
    //(A.) Sensor Data
    let backIdx = Object.keys(data['garden']).length-offset;
    let IDCurrent = (data['garden'][backIdx]['id']);
    if(IDCurrent != IDPrevious){
        let resistive = parseFloat(data['garden'][backIdx]['moist_res']);
        let capacitive = parseFloat(data['garden'][backIdx]['moist_cap']);
        let distance = parseFloat(data['garden'][backIdx]['distance']);
        let light = parseFloat(data['garden'][backIdx]['light']);
        let time = (data['garden'][backIdx]['timestamp']).slice(5);
        currTime = time;

        pair_res = [time, resistive];
        pair_cap = [time, capacitive];
        pair_distance = [time, distance];
        pair_light = [time, light];
        
        timestamp.push(time);
        timestamp.shift();

        multiGraph.data.labels = timestamp;
        uniGraph.data.labels = timestamp;

        pairs_res.push(pair_res);
        pairs_res.shift();

        pairs_cap.push(pair_cap);
        pairs_cap.shift();

        pairs_light.push(pair_light);
        pairs_light.shift();

        pairs_distance.push(pair_distance);
        pairs_distance.shift();

        multiGraph.data.datasets[0].data = pairs_res;
        multiGraph.data.datasets[1].data = pairs_cap;
        multiGraph.data.datasets[2].data = pairs_light;

        uniGraph.data.datasets[0].data = pairs_distance;

        multiGraph.update();
        uniGraph.update();
    }
    IDPrevious = IDCurrent;
}

async function chartActuatorEntry() {
    const actuator_response = await fetch(actuator_url);
    const actuator_data = await actuator_response.json();

    //(B.) Actuator Data
    let actuator_backIdx = Object.keys(actuator_data['pump']).length-1;
    let pumpStr = (actuator_data['pump'][actuator_backIdx]['status']);
    //let time = (actuator_data['pump'][actuator_backIdx]['timestamp']).slice(5);
    let time = currTime;                    //FIXME: get rid of this when pumpGraph has its own updatable timestamps.
    let pumpState = 0;
    if(pumpStr === "on"){ pumpState = 1; }
    else if (pumpStr === "off"){ pumpState = 0;}
    else {pumpState = 0;}

    pair_pump = [time, pumpState];

    pairs_pump.push(pair_pump);
    pairs_pump.shift();

    pumpGraph.data.labels = timestamp;

    pumpGraph.data.datasets[0].data = pairs_pump;

    pumpGraph.update();
}

function chartMultiGraph() {
    //(1.) Data:
    let resistiveData = {
        label: 'Resistive Soil Moisture', data: pairs_res, type: 'line', lineTension: 0.1, borderColor: 'rgb(0, 99,132)',
        pointRadius: 3, pointBorderColor: 'rgb(0,50,50)', pointBackgroundColor: 'rgb(0, 99,132)', pointBorderWidth: 1, 
        pointHoverRadius: 5, borderWidth: 3, backgroundColor: 'rgb(0,99,132)', yAxisID: 'y'
    }
    
    let capacitiveData = {
        label: 'Capacitive Soil Moisture', data: pairs_cap,
        type: 'line',
        lineTension: 0.1,                           //curviness of the line
        borderColor: 'rgb(0,50,50)',                //line border color
        pointRadius: 3,                             //data point radius
        pointBorderColor: 'rgb(0, 99,132)',         //border of the datapoint
        pointBackgroundColor: 'rgb(0,50,50)',        //dark blue
        pointBorderWidth: 1,                         //width of the point border when hovering
        pointHoverRadius: 5,                        //radius of the data point when hovering
        borderWidth: 3,                              //width of the data label border
        backgroundColor: 'rgb(0,50,50)',             //background color of the data label border
        yAxisID: 'y'
    }
    
    let lightData = {
        label: 'Light Intensity', data: pairs_res, type: 'line', lineTension: 0, borderColor: '#e87a4d',
        pointRadius: 3, pointBorderColor: '#e87a4d', pointBackgroundColor: '#e87a4d', pointBorderWidth: 1, 
        pointHoverRadius: 5, borderWidth: 3, backgroundColor: '#e87a4d', yAxisID: 'l'
    }
    
    const data = { labels: timestamp, datasets: [resistiveData, capacitiveData, lightData]}
    
    //(2.) Axis Titles:
    const X = { title: {color: 'black', display: true, text: 'Timestamp'},  ticks: { color: 'black', stepsize: 10}, min: 0, max: 1000}
    
    const YPercent = { title: { color: 'black', display: true, text: 'Soil Moisture (%)'}, 
                beginAtZero: true, type: 'linear', position: 'left', 
                ticks: { color: 'black', stepsize: 5, 
                    callback: function(value, index, values) {
                        return value + '%';
                }}, min: 0, max: 100}
    
    const YLux = {title: {color: 'black', display: true, text: 'Light Intensity (Lux)'},
                beginAtZero: true, type: 'logarithmic', position: 'right',
                ticks: {
                    min: 0,
                    max: 1000000,
                    callback: function (value, index, values) {
                        if (value === 1000000) return "1M L";
                        if (value === 100000) return "100K L";
                        if (value === 10000) return "10K L";
                        if (value === 1000) return "1000L";
                        if (value === 100) return "100L";
                        if (value === 10) return "10L";
                        if (value === 1) return "1L";
                        if(value === 0.1) return "0.1L";
                        if (value === 0.01) return "0L";
                        return null;
                    }
               },
                grid: {drawOnChartArea: false}, scaleLabel: {display: true, labelString: 'L'}, min: 0.01, max: 10000}
    
    const CALLBACKS = {
        title: function(context){
            return `At Time ${context[0].label}:`;        //returns the X-coordinate (timestamp)
        },
        label: function(item, everything){
            let dataUnits = '';
            if(item.dataset.label == 'Capacitive Data') { dataUnits = "%";} 
            else if (item.dataset.label == 'Resistive Data') {dataUnits = "%";}
            else if (item.dataset.label == 'Light Data') { dataUnits = "L";}
            return `${item.dataset.label}: ${item.formattedValue}`+dataUnits;      //formattedValue = Y-val, item.label = X-val
        }
    }
    
    const PLUGINS = {
        tooltip:{
            callbacks: CALLBACKS
        }
    }
    
    const options = {
        scales: {
            x: X,
            y: YPercent,
            l: YLux 
        },
        responsive:true,
        maintainAspectRatio: true,
        animation: {duration: 0},                   //gets rid of the graph rendering that happens b/w updates
        plugins: PLUGINS
    }
    
    const config = {
        data: data,
        options: options
    }

    return config;
}

function chartUniGraph() {
    //(1.) Data:
    let distanceData = {
        label: 'Water Level Data', data: pairs_distance, type: 'line', lineTension: 0.1, borderColor: '#10a924',
        pointRadius: 3, pointBorderColor: '#10a924', pointBackgroundColor: '#10a924', pointBorderWidth: 1, 
        pointHoverRadius: 5, borderWidth: 3, backgroundColor: '#10a924', yAxisID: 'y'
    }

    const data = { labels: timestamp, datasets: [distanceData]}

    //(2.) Axis:
    const X = { title: {color: 'black', display: true, text: 'Timestamp'},  ticks: { color: 'black', stepsize: 10}, min: 0, max: 1000}
    
    const YDistance = { title: { color: 'black', display: true, text: 'Water Reservoir Level (Cm)'}, 
                beginAtZero: true, type: 'linear', position: 'left', 
                ticks: { color: 'black', stepsize: 5, 
                    callback: function(value, index, values) {
                        return value + 'cm';
                }}, min: 0, max: 50}
    
    const CALLBACKS = {
        title: function(context){
            return `At Time ${context[0].label}:`;        //returns the X-coordinate (timestamp)
        },
        label: function(item, everything){
            let dataUnits = '';
            if(item.dataset.label == 'Water Level Data') { dataUnits = "cm";} 
            return `${item.dataset.label}: ${item.formattedValue}`+dataUnits;      //formattedValue = Y-val, item.label = X-val
        }
    }
    
    const PLUGINS = {
        tooltip:{
            callbacks: CALLBACKS
        }
    }
    
    const options = {
        scales: {
            x: X,
            y: YDistance
        },
        responsive:true,
        maintainAspectRatio: true,
        animation: {duration: 0},                   //gets rid of the graph rendering that happens b/w updates
        plugins: PLUGINS
    }
    
    const config = {
        data: data,
        options: options
    }

    return config;
}

function chartPumpGraph() {
    //(1.) Data: Set stepped: true to allow stepped interpolation
    let pumpData = {
        label: 'Water Valve State', data: pairs_pump, lineTension: 0.1, borderColor: '#052428',
        pointRadius: 3, pointBorderColor: '#052428', pointBackgroundColor: '#052428', pointBorderWidth: 1, 
        pointHoverRadius: 5, borderWidth: 3, backgroundColor: '#052428', stepped: true, yAxisID: 'y'         
    }

    const data = { labels: timestamp, datasets: [pumpData]}

    //(2.) Axis:
    const X = { title: {color: 'black', display: true, text: 'Timestamp'},  ticks: { color: 'black', stepsize: 10}, min: 0, max: 1000}
    
    const YPump = { title: { color: 'black', display: true, text: 'Valve: 0 is OFF, 1 is ON'}, 
                beginAtZero: true, type: 'linear', position: 'left', 
                ticks: {color: 'black', beginAtZero: true, stepsize: 1,
                callback: function(value, index, values)    {               //ensures stepsize always 1.
                    if(Math.floor(value) === value){
                        return value;
                    }
                }
            }, min: 0, max: 2}
    
    const CALLBACKS = {
        title: function(context){
            return `At Time ${context[0].label}:`;        //returns the X-coordinate (timestamp)
        }
    }
    const PLUGINS = {
        tooltip:{
            callbacks: CALLBACKS
        },
        title: {
            display: true,
            text: (ctx) => 'Step ' + ctx.chart.data.datasets[0].stepped + ' Interpolation'
        }
    }

    const options = {
        scales: {
            x: X,
            y: YPump
        },
        responsive: true,
        interaction: {
            intersect: false,
            axis: 'x'
        },
        maintainAspectRatio: true,
        animation: {duration: 0},                   //gets rid of the graph rendering that happens b/w updates
        plugins: PLUGINS
    }
    
    const config = {
        type: 'line',
        data: data,
        options: options
    }

    return config;
}