#[cfg(test)]
mod tests {
  use crate::data::types::*;
  use crate::data::loader::DataLoader;
  use std::io::Write;
  use tempfile::NamedTempFile;

  fn make_bar(timestamp: chrono::DateTime<chrono::Utc>, open: f64, high: f64, low: f64, close: f64, volume: f64) -> KlineBar {
    KlineBar::new(timestamp, open, high, low, close, volume, "TEST".to_string(), Interval::Day1)
  }

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
      make_bar(base_time, 100.0, 110.0, 90.0, 105.0, 1000.0),
      make_bar(base_time, 100.0, 110.0, 90.0, 105.0, 1000.0),
    ];

    DataLoader::clean(&mut data);
    assert_eq!(data.len(), 1);
  }

  #[test]
  fn test_clean_data_removes_invalid_bars() {
    let base_time = chrono::Utc::now();
    let mut data = vec![
      make_bar(base_time, 0.0, 0.0, 0.0, 0.0, 1000.0),
      make_bar(base_time + chrono::Duration::days(1), 100.0, 110.0, 90.0, 105.0, 1000.0),
    ];

    DataLoader::clean(&mut data);
    assert_eq!(data.len(), 1);
    assert_eq!(data[0].open, 100.0);
  }

  #[test]
  fn test_clean_data_sorts_by_timestamp() {
    let base_time = chrono::Utc::now();
    let mut data = vec![
      make_bar(base_time + chrono::Duration::days(2), 102.0, 112.0, 92.0, 107.0, 1000.0),
      make_bar(base_time, 100.0, 110.0, 90.0, 105.0, 1000.0),
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