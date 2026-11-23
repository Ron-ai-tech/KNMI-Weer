const $ = id => document.getElementById(id);
let coords = { latitude: 51.8867, longitude: 5.4292, name: "Tiel" };

const weatherText = code => ({
  0:"Onbewolkt",1:"Overwegend helder",2:"Half bewolkt",3:"Bewolkt",
  45:"Mist",48:"Rijpmist",51:"Lichte motregen",53:"Motregen",55:"Dichte motregen",
  61:"Lichte regen",63:"Regen",65:"Zware regen",71:"Lichte sneeuw",73:"Sneeuw",
  75:"Zware sneeuw",80:"Regenbuien",81:"Buien",82:"Zware buien",
  95:"Onweer",96:"Onweer met hagel",99:"Zwaar onweer"
}[code] || "Wisselvallig");

const dayName = date => new Intl.DateTimeFormat("nl-NL",{weekday:"long"}).format(new Date(date+"T12:00:00"));
const time = value => value ? value.slice(11,16) : "--:--";
const hours = seconds => (seconds / 3600).toLocaleString("nl-NL",{maximumFractionDigits:1});

async function loadWeather() {
  $("place").textContent = coords.name;
  $("sourcePlace").textContent = coords.name;
  $("updated").textContent = "Weerbericht wordt bijgewerkt…";
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude:coords.latitude, longitude:coords.longitude,
    current:"temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code",
    hourly:"sunshine_duration,cloud_cover",
    daily:"sunshine_duration,sunrise,sunset,precipitation_sum,weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days:"7", timezone:"auto"
  });
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weergegevens niet beschikbaar");
    const data = await response.json();
    const c = data.current, d = data.daily;
    $("temp").textContent = Math.round(c.temperature_2m);
    $("condition").textContent = weatherText(c.weather_code);
    $("feels").textContent = `Voelt als ${Math.round(c.apparent_temperature)}°C`;
    $("rain").textContent = `${Number(c.precipitation).toLocaleString("nl-NL")} mm`;
    $("wind").textContent = `${Math.round(c.wind_speed_10m)} km/u`;
    $("sunrise").textContent = time(d.sunrise[0]);
    $("sunset").textContent = time(d.sunset[0]);
    $("sunHours").textContent = hours(d.sunshine_duration[0]);
    $("updated").textContent = `Bijgewerkt om ${time(c.time)}`;

    const today = c.time.slice(0,10);
    const entries = data.hourly.time.map((t,i)=>({t, seconds:data.hourly.sunshine_duration[i]||0, cloud:data.hourly.cloud_cover[i]||0}))
      .filter(x=>x.t.startsWith(today));
    const daylight = entries.filter(x=>x.t.slice(11,13)>="06" && x.t.slice(11,13)<="22");
    const best = [...daylight].sort((a,b)=>b.seconds-a.seconds).slice(0,3);
    if (best.length && best[0].seconds > 0) {
      $("sunPeak").textContent = `Meeste zon verwacht rond ${best.map(x=>time(x.t)).join(", ")} uur.`;
    } else {
      $("sunPeak").textContent = "Vandaag wordt weinig directe zonneschijn verwacht.";
    }
    $("hourly").innerHTML = daylight.map(x=>{
      const pct = Math.max(3,Math.min(100,(x.seconds/3600)*100));
      return `<div class="hour"><div class="bar-wrap"><div class="bar" style="height:${pct}%"></div></div><b>${time(x.t).slice(0,2)}</b><small>${Math.round(x.seconds/60)}m</small></div>`;
    }).join("");

    $("days").innerHTML = d.time.map((date,i)=>`
      <div class="day">
        <span class="day-name">${i===0?"Vandaag":dayName(date)}</span>
        <span class="day-weather">${weatherText(d.weather_code[i])}</span>
        <span class="day-sun">☀ ${hours(d.sunshine_duration[i])} u</span>
        <span class="day-temp">${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</span>
      </div>`).join("");
  } catch (error) {
    $("updated").textContent = "Weerdata kon niet worden geladen. Probeer later opnieuw.";
    $("condition").textContent = "Geen verbinding";
    console.error(error);
  }
}

$("locate").addEventListener("click",()=>{
  if (!navigator.geolocation) return alert("Locatie wordt niet ondersteund door deze browser.");
  navigator.geolocation.getCurrentPosition(pos=>{
    coords={latitude:pos.coords.latitude,longitude:pos.coords.longitude,name:"Mijn locatie"};
    loadWeather();
  },()=>alert("Locatie niet beschikbaar. De app blijft Tiel gebruiken."));
});

loadWeather();
setInterval(loadWeather, 30*60*1000);
