#[cfg(test)]
mod tests {
  use crate::data::types::*;
  use crate::data::loader::DataLoader;
  use std::io::Write;
  use tempfile::NamedTempFile;

  #[test]
  fn test_interval_as_str() {
    assert_eq!(Interval::Min5.as_str(), "5min");
    assert_eq!(Interval::Min15.as_str(), "15min");
    assert_eq!(Interval::Min30.as_str(), "30min");
    assert_eq!(Interval::Day1.as_str(), "day");
  }

  #[test]
  fn test_interval_display() {
    assert_eq!(format!("{}", Interval::Min5), "5min");
    assert_eq!(format!("{}", Interval::Day1), "day");
  }

  #[test]
  fn test_clean_data_removes_duplicates() {
    let base_time = chrono::Utc::now();
    let mut data = vec![
      KlineBar {
        timestamp: base_time,
        open: 100.0,
        high: 110.0,
        low: 90.0,
        close: 105.0,
        volume: 1000.0,
        symbol: "TEST".to_string(),
        interval: Interval::Day1,
      },
      KlineBar {
        timestamp: base_time,
        open: 100.0,
        high: 110.0,
        low: 90.0,
        close: 105.0,
        volume: 1000.0,
        symbol: "TEST".to_string(),
        interval: Interval::Day1,
      },
    ];

    DataLoader::clean(&mut data);
    assert_eq!(data.len(), 1);
  }

  #[test]
  fn test_clean_data_removes_invalid_bars() {
    let base_time = chrono::Utc::now();
    let mut data = vec![
      KlineBar {
        timestamp: base_time,
        open: 0.0,
        high: 0.0,
        low: 0.0,
        close: 0.0,
        volume: 1000.0,
        symbol: "TEST".to_string(),
        interval: Interval::Day1,
      },
      KlineBar {
        timestamp: base_time + chrono::Duration::days(1),
        open: 100.0,
        high: 110.0,
        low: 90.0,
        close: 105.0,
        volume: 1000.0,
        symbol: "TEST".to_string(),
        interval: Interval::Day1,
      },
    ];

    DataLoader::clean(&mut data);
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].open, 100.0);
  }

  #[test]
  fn test_clean_data_sorts_by_timestamp() {
    let base_time = chrono::Utc::now();
    let mut data = vec![
      KlineBar {
        timestamp: base_time + chrono::Duration::days(2),
        open: 102.0,
        high: 112.0,
        low: 92.0,
        close: 107.0,
        volume: 1000.0,
        symbol: "TEST".to_string(),
        interval: Interval::Day1,
      },
      KlineBar {
        timestamp: base_time,
        open: 100.0,
        high: 110.0,
        low: 90.0,
        close: 105.0,
        volume: 1000.0,
        symbol: "TEST".to_string(),
        interval: Interval::Day1,
      },
    ];

    DataLoader::clean(&mut data);
    assert!(data[0].timestamp <= data[1].timestamp);
  }

  #[test]
  fn test_load_csv_valid_data() {
    let mut file = NamedTempFile::new().unwrap();
    writeln!(file, "time,open,high,low,close,volume").unwrap();
    writeln!(file, "2023-11-15 00:00:00,100,110,90,105,1000").unwrap();
    writeln!(file, "2023-11-16 00:00:00,105,115,95,110,1200").unwrap();

    let result = DataLoader::load_csv(file.path().to_str().unwrap(), "TEST", Interval::Day1);
    if let Err(ref e) = result {
      eprintln!("CSV load error: {:?}", e);
    }
    assert!(result.is_ok(), "Failed to load CSV: {:?}", result.err());
    let klines = result.unwrap();
    assert_eq!(klines.len(), 2);
    assert_eq!(klines[0].symbol, "TEST");
    assert_eq!(klines[0].interval, Interval::Day1);
  }

  #[test]
  fn test_load_csv_missing_columns() {
    let mut file = NamedTempFile::new().unwrap();
    writeln!(file, "time,open,high").unwrap();
    writeln!(file, "1700000000000,100,110").unwrap();

    let result = DataLoader::load_csv(file.path().to_str().unwrap(), "TEST", Interval::Day1);
    assert!(result.is_err());
  }
}
