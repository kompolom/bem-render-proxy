import config from "./cfg";
import app from "./app";

app.listen(config.APP_PORT, function () {
  console.log("render-proxy is listening on", this.address().port);
});
