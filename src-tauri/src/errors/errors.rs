use thiserror::Error;

/// 应用层错误类型
#[derive(Error, Debug)]
pub enum AppError {
  #[error("无效的文件格式: {0}")]
  InvalidFormat(String),

  #[error("无效的周期: {0}")]
  InvalidInterval(String),

  #[error("数据加载失败: {0}")]
  DataLoadError(#[from] anyhow::Error),

  #[error("内部错误: {0}")]
  Internal(String),
}

impl serde::Serialize for AppError {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: serde::Serializer,
  {
    serializer.serialize_str(&self.to_string())
  }
}
