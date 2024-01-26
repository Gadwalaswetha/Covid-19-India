const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, 'covid19India.db')

const app = express()

app.use(express.json())

let database = null

const objectSnakeToCamel = (newObject) => {
  return {
    stateId: newObject.state_id,
    stateName: newObject.state_name,
    population: newObject.population,
  }
}

const districtSnakeToCamel = (newObject) => {
  return {
    districtId: newObject.district_Id,
    districtName: newObject.district_name,
    stateId: newObject.state_id,
    cases:newObject.cases,
    cured:newObject.cured,
    active:newObject.active,
    deaths:newObject.deaths,
  }
}

const reportSnakeToCamelCase=(newObject)=>{
  return {
    totalCases: newObject.cases,
    totalCured: newObject.cured,
    totalActive: newObject.active,
    totalDeaths: newObject.deaths,
  }
}

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Is Running'),
    });
  } catch (error) {
    console.log(`error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()
app.get('/states/', async (request, response) => {
  const allStatesList = `
    SELECT *
    FROM state
    ORDER BY state_id;`
  const statesList = await database.all(allStatesList)
  const statesResult=statesList.map((eachObject)=>{
    return objectSnakeToCamel(eachObject);
  })
  response.send(statesResult)
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getState = `
    SELECT *
    FROM state
    WHERE 
      state_id = ${stateId};`
  const newState = await database.get(getState)
  const stateResult=objectSnakeToCamel(newState);
  response.send(stateResult)
})

app.post('/districts/', async (request, response) => {
  const createDistrict = request.body
  const {districtName,stateId,cases,cured,active,deaths}=createDistrict;
  const newDistrict = `
  INSERT INTO
    district (district_name, state_id, cases,cured,active,deaths)
  VALUES
    ('${districtName}', ${stateId}, ${cases},${cured},${active},${deaths});`
  const addDistrict = await database.run(newDistrict)
  const districtId=addDistrict.lastId;
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrict = `
  SELECT *
  FROM district
  WHERE
    district_id = ${districtId};`
  const newDistrict=await database.get(getDistrict)
  const districtResult=districtSnakeToCamel(newDistrict);
  response.send(districtResult)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrict = `
  DELETE 
  FROM district   
  WHERE
    district_id = ${districtId};`
  await database.run(deleteDistrict)
  response.send('District Removed')
})
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId}=request.params;
  const districtDetails=request.body;
  const {districtName,stateId,cases,cured,active,deaths}=districtDetails;
  const updateDistrict = `
    UPDATE
        district
    SET
        district_name='${districtName}'
        state_id=${stateId}
        cases=${cases}
        cured=${cured}
        active=${active}
        deaths=${deaths}
    WHERE district_id=${districtId};`;
  await database.run(updateDistrict)
  response.send("District Details Updated"),
})
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateReport = `
    SELECT SUM(cases) AS cases,
        SUM(cured) AS cured,
        SUM(active) AS active,
        SUM(deaths) AS deaths,
    FROM district
    WHERE
      state_id=${stateId};`
  const stateReport = await database.get(getStateReport);
  const resultReport=reportSnakeToCamelCase(stateReport);
  response.send(resultReport),
})
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const stateDetails = `
    SELECT state_name
    FROM state JOIN district 
        ON state.state_id=district.state_id
    WHERE
      district.district_id=${districtId};`
  const stateName = await database.get(stateDetails);
  response.send({stateName:stateName.state_name}),
})
module.exports = app;
