const express = require("express");

const app = express();

const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Is Running Successfully at http://localhost:3000");
    });
  } catch (e) {
    console.log(`${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const userDetails = {
  username: "christopher_phillips",
  password: "christy@123",
};

const convertStatesIntoObj = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertDistrictIntoObj = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

//middleware function

const authenticateToken = (request, response, next) => {
  let jwtToken;

  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "react", (error, payLoad) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const getUserQuery = `SELECT * FROM user WHERE username='${username}';`;

  const selectedUser = await db.get(getUserQuery);

  if (selectedUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordPresent = await bcrypt.compare(
      password,
      selectedUser.password
    );

    if (isPasswordPresent === true) {
      const payLoad = { username: username };
      const jwtToken = jwt.sign(payLoad, "react");

      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/states/", authenticateToken, async (request, response) => {
  const getAllStateQuery = `SELECT * FROM state ;`;

  const allStates = await db.all(getAllStateQuery);

  const statesList = allStates.map((state) => convertStatesIntoObj(state));

  response.send(statesList);
});

//API 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id='${stateId}';`;

  const stateDetails = await db.get(getStateQuery);
  response.send(convertStatesIntoObj(stateDetails));
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const createDistrictQuery = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
                                    VALUES ('${districtName}', '${stateId}', '${cases}' , '${cured}', '${active}', '${deaths}' );`;

  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    const getDistrictQuery = `SELECT *  FROM district WHERE district_id='${districtId}';`;

    const districtDetails = await db.get(getDistrictQuery);

    response.send(convertDistrictIntoObj(districtDetails));
  }
);

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    const removeDistrictQuery = `DELETE FROM district WHERE district_id ='${districtId}';`;

    await db.run(removeDistrictQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    const updateDistrictQuery = `UPDATE district SET district_name='${districtName}' , state_id='${stateId}' , cases='${cases}', cured='${cured}' , active='${active}' , deaths='${deaths}'  WHERE district_id ='${districtId}' `;

    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;

    const getStatsQuery = `SELECT SUM(cases) as totalCases ,SUM(cured) AS totalCured, SUM(active) AS totalActive , SUM(deaths) AS totalDeaths FROM district WHERE state_id='${stateId}'`;

    const stateStats = await db.get(getStatsQuery);
    response.send(stateStats);
  }
);
module.exports = app;
