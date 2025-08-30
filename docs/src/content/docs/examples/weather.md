---
title: Weather Server Example
description: A weather information MCP server using external APIs
---

This example demonstrates integration with external APIs, caching, and data transformation.

## Complete Implementation

```typescript
import { MCPServer, Tool, Resource, Prompt, Toolkit } from 'ts-mcp-forge';
import { StdioTransport } from '@modelcontextprotocol/sdk/node';
import { Result, ok, err } from 'neverthrow';
import { ToolErrors } from 'ts-mcp-forge';

// Weather Toolkit for organization
@Toolkit({ namespace: 'weather' })
class WeatherToolkit {
  private cache = new Map<string, CachedWeatherData>();
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 minutes
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  @Tool({ description: 'Get current weather for a city' })
  async current(city: string): Promise<Result<WeatherData, ToolErrors.NotFound>> {
    const cached = this.getCached(city);
    if (cached) {
      return ok(cached);
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/weather?q=${city}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        return err(ToolErrors.NotFound(`City not found: ${city}`));
      }

      const data = await response.json();
      const weather = this.transformWeatherData(data);

      this.setCached(city, weather);
      return ok(weather);
    } catch (error: any) {
      return err(ToolErrors.Internal(`API error: ${error.message}`));
    }
  }

  @Tool({ description: 'Get weather forecast for a city' })
  async forecast(
    city: string,
    days: number = 5
  ): Promise<Result<ForecastData, ToolErrors.NotFound>> {
    try {
      const response = await fetch(
        `${this.apiUrl}/forecast?q=${city}&appid=${this.apiKey}&units=metric&cnt=${days * 8}`
      );

      if (!response.ok) {
        return err(ToolErrors.NotFound(`City not found: ${city}`));
      }

      const data = await response.json();
      const forecast = this.transformForecastData(data);

      return ok(forecast);
    } catch (error: any) {
      return err(ToolErrors.Internal(`API error: ${error.message}`));
    }
  }

  @Tool({ description: 'Compare weather between cities' })
  async compare(cities: string[]): Promise<Result<WeatherComparison, ToolErrors.InvalidParams>> {
    if (cities.length < 2) {
      return err(ToolErrors.InvalidParams('At least 2 cities required for comparison'));
    }

    const weatherData: WeatherData[] = [];

    for (const city of cities) {
      const result = await this.current(city);
      if (result.isErr()) {
        return err(ToolErrors.NotFound(`Failed to get weather for ${city}`));
      }
      weatherData.push(result.value);
    }

    const comparison = this.createComparison(weatherData);
    return ok(comparison);
  }

  private transformWeatherData(data: any): WeatherData {
    return {
      city: data.name,
      country: data.sys.country,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      cloudiness: data.clouds.all,
      visibility: data.visibility,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      timestamp: new Date(),
    };
  }

  private transformForecastData(data: any): ForecastData {
    const dailyForecasts = new Map<string, DayForecast>();

    for (const item of data.list) {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, {
          date: dateKey,
          minTemp: item.main.temp_min,
          maxTemp: item.main.temp_max,
          avgTemp: item.main.temp,
          humidity: item.main.humidity,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          hourly: [],
        });
      }

      const dayForecast = dailyForecasts.get(dateKey)!;
      dayForecast.minTemp = Math.min(dayForecast.minTemp, item.main.temp_min);
      dayForecast.maxTemp = Math.max(dayForecast.maxTemp, item.main.temp_max);

      dayForecast.hourly.push({
        time: date.toLocaleTimeString(),
        temperature: item.main.temp,
        description: item.weather[0].description,
      });
    }

    return {
      city: data.city.name,
      country: data.city.country,
      days: Array.from(dailyForecasts.values()),
    };
  }

  private createComparison(weatherData: WeatherData[]): WeatherComparison {
    const temps = weatherData.map((w) => w.temperature);
    const humidities = weatherData.map((w) => w.humidity);
    const windSpeeds = weatherData.map((w) => w.windSpeed);

    return {
      cities: weatherData.map((w) => ({
        name: w.city,
        temperature: w.temperature,
        humidity: w.humidity,
        windSpeed: w.windSpeed,
        description: w.description,
      })),
      warmest: weatherData[temps.indexOf(Math.max(...temps))].city,
      coldest: weatherData[temps.indexOf(Math.min(...temps))].city,
      mostHumid: weatherData[humidities.indexOf(Math.max(...humidities))].city,
      windiest: weatherData[windSpeeds.indexOf(Math.max(...windSpeeds))].city,
      averageTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
    };
  }

  private getCached(city: string): WeatherData | null {
    const cached = this.cache.get(city.toLowerCase());
    if (!cached) return null;

    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.cacheTimeout) {
      this.cache.delete(city.toLowerCase());
      return null;
    }

    return cached.data;
  }

  private setCached(city: string, data: WeatherData): void {
    this.cache.set(city.toLowerCase(), {
      data,
      timestamp: new Date(),
    });
  }
}

// Main Weather Server
class WeatherServer extends MCPServer {
  private weatherToolkit: WeatherToolkit;
  private savedLocations: Set<string> = new Set();

  constructor(apiKey: string) {
    super();
    this.weatherToolkit = new WeatherToolkit(apiKey);
    this.useToolkit(this.weatherToolkit);
  }

  // Additional server-specific tools
  @Tool({ description: 'Save a location for quick access' })
  saveLocation(city: string): void {
    this.savedLocations.add(city);
  }

  @Tool({ description: 'Get weather for all saved locations' })
  async getSavedWeather(): Promise<WeatherData[]> {
    const results: WeatherData[] = [];

    for (const city of this.savedLocations) {
      const weather = await this.weatherToolkit.current(city);
      if (weather.isOk()) {
        results.push(weather.value);
      }
    }

    return results;
  }

  // Resources
  @Resource({
    uri: 'weather://saved',
    name: 'Saved Locations',
    description: 'List of saved weather locations',
    mimeType: 'application/json',
  })
  getSavedLocations(): string {
    return JSON.stringify(Array.from(this.savedLocations), null, 2);
  }

  @Resource({
    uri: 'weather://alerts',
    name: 'Weather Alerts',
    description: 'Active weather alerts',
    mimeType: 'application/json',
  })
  async getAlerts(): Promise<string> {
    // This would integrate with a weather alerts API
    return JSON.stringify(
      {
        alerts: [],
        lastUpdated: new Date(),
      },
      null,
      2
    );
  }

  // Prompts
  @Prompt({
    name: 'weather-report',
    description: 'Generate a weather report',
    arguments: [
      { name: 'city', description: 'City name', required: true },
      { name: 'style', description: 'Report style', required: false },
    ],
  })
  weatherReportPrompt(city: string, style: string = 'detailed'): string {
    const styles = {
      brief: 'Provide a brief weather summary',
      detailed: 'Provide a detailed weather report with all conditions',
      forecast: 'Focus on the upcoming forecast',
      travel: 'Provide weather advice for travelers',
    };

    return `Generate a ${style} weather report for ${city}.
${styles[style as keyof typeof styles] || styles.detailed}.

Include:
- Current conditions
- Temperature and feels-like
- Wind and precipitation
- Recommendations for the day
- Any weather warnings`;
  }

  @Prompt({
    name: 'weather-comparison',
    description: 'Compare weather between cities',
    arguments: [{ name: 'cities', description: 'Comma-separated city names', required: true }],
  })
  comparisonPrompt(cities: string): string {
    return `Compare the weather conditions between these cities: ${cities}

Analyze:
- Temperature differences
- Weather patterns
- Best city for outdoor activities
- Travel recommendations
- Climate contrasts`;
  }
}

// Type Definitions
interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudiness: number;
  visibility: number;
  description: string;
  icon: string;
  sunrise: Date;
  sunset: Date;
  timestamp: Date;
}

interface ForecastData {
  city: string;
  country: string;
  days: DayForecast[];
}

interface DayForecast {
  date: string;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  humidity: number;
  description: string;
  icon: string;
  hourly: HourlyForecast[];
}

interface HourlyForecast {
  time: string;
  temperature: number;
  description: string;
}

interface WeatherComparison {
  cities: Array<{
    name: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    description: string;
  }>;
  warmest: string;
  coldest: string;
  mostHumid: string;
  windiest: string;
  averageTemp: number;
}

interface CachedWeatherData {
  data: WeatherData;
  timestamp: Date;
}

// Main entry point
async function main() {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.error('Please set OPENWEATHER_API_KEY environment variable');
    process.exit(1);
  }

  const server = new WeatherServer(apiKey);
  const transport = new StdioTransport();

  await server.connect(transport);
  console.error('Weather MCP server is running');
}

main().catch(console.error);
```

## Features Demonstrated

1. **External API Integration**: OpenWeatherMap API integration
2. **Caching Strategy**: Time-based cache for API responses
3. **Toolkit Pattern**: Organized tools using the Toolkit decorator
4. **Data Transformation**: Converting API responses to domain models
5. **Comparison Logic**: Multi-city weather comparison
6. **Error Recovery**: Graceful handling of API failures
7. **Environment Configuration**: API key management

## Setup Instructions

1. Get an API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Set the environment variable: `export OPENWEATHER_API_KEY=your_key`
3. Follow the same setup as the Calculator example
4. Run with: `tsx weather-server.ts`

## Best Practices Shown

- **API Rate Limiting**: Cache responses to reduce API calls
- **Data Validation**: Validate API responses before use
- **Toolkit Organization**: Group related tools together
- **State Management**: Manage saved locations and cache
- **Error Messages**: Provide helpful error context
- **Type Safety**: Full typing for all data structures
