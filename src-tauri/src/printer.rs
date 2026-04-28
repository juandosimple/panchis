use std::fs;
use std::path::PathBuf;
use chrono::Local;

#[cfg(not(target_os = "windows"))]
use std::process::Command;


#[derive(Clone)]
pub struct OrderReceipt {
    pub numero: i32,
    pub items: String,
    pub total: f64,
    pub zona: String,
    pub hora: String,
    pub metodo_pago: String,
}

pub fn print_order(order: OrderReceipt, port_name: &str) -> Result<(), String> {
    let receipt = build_receipt(&order);
    let tmp_path = std::env::temp_dir().join("panchis_receipt.txt");
    fs::write(&tmp_path, &receipt).map_err(|e| format!("Error writing temp file: {}", e))?;

    let result = send_to_printer(&tmp_path, port_name);
    let _ = fs::remove_file(&tmp_path);
    result
}

pub fn get_available_ports() -> Result<Vec<String>, String> {
    let printers = list_printers().unwrap_or_default();
    if printers.is_empty() {
        eprintln!("No se detectaron impresoras, usando POS80 por defecto");
        return Ok(vec!["POS80".to_string()]);
    }
    for p in &printers {
        eprintln!("Impresora detectada: {}", p);
    }
    Ok(printers)
}

#[cfg(target_os = "windows")]
fn list_printers() -> Result<Vec<String>, String> {
    // Use winspool API via the printers crate (no PowerShell, no console flash)
    let all = printers::get_printers();
    let filtered: Vec<String> = all
        .into_iter()
        .map(|p| p.name)
        .filter(|name| {
            let lower = name.to_lowercase();
            !lower.contains("pdf")
                && !lower.contains("xps")
                && !lower.contains("onenote")
                && !lower.contains("fax")
        })
        .collect();
    Ok(filtered)
}

#[cfg(not(target_os = "windows"))]
fn list_printers() -> Result<Vec<String>, String> {
    let output = Command::new("lpstat")
        .arg("-p")
        .output()
        .map_err(|e| format!("Error detectando impresoras: {}", e))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let s = String::from_utf8_lossy(&output.stdout);
    let mut printers = Vec::new();
    for line in s.lines() {
        // Format: "printer POS80 is idle.  enabled since..."
        if line.contains("printer") && line.contains("is ") {
            if let Some(name) = line.split_whitespace().nth(1) {
                printers.push(name.to_string());
            }
        }
    }
    Ok(printers)
}

#[cfg(target_os = "windows")]
fn send_to_printer(file: &PathBuf, printer_name: &str) -> Result<(), String> {
    let bytes = fs::read(file).map_err(|e| format!("Error reading temp file: {}", e))?;

    let printer = printers::get_printer_by_name(printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", printer_name))?;

    printer
        .print(&bytes, printers::common::base::job::PrinterJobOptions::none())
        .map_err(|e| format!("La impresora '{}' rechazó el trabajo: {}. Verificá que esté conectada y encendida.", printer_name, e))?;

    eprintln!("✓ Impresión enviada a {}", printer_name);
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn send_to_printer(file: &PathBuf, printer: &str) -> Result<(), String> {
    let output = Command::new("lp")
        .arg("-d")
        .arg(printer)
        .arg(file)
        .output()
        .map_err(|e| format!("Error ejecutando lp: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Printer error: {}", err_msg));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let job_id = parse_job_id(&stdout);

    if let Some(ref id) = job_id {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        let status = Command::new("lpstat")
            .arg("-W").arg("not-completed")
            .output();
        if let Ok(out) = status {
            let pending = String::from_utf8_lossy(&out.stdout);
            if pending.contains(id) {
                let _ = Command::new("cancel").arg(id).output();
                return Err(format!(
                    "La impresora '{}' no respondió. Verificá que esté conectada y encendida.",
                    printer
                ));
            }
        }
    }

    eprintln!("✓ Impresión enviada a {}", printer);
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn parse_job_id(stdout: &str) -> Option<String> {
    let prefix = "request id is ";
    let start = stdout.find(prefix)?;
    let rest = &stdout[start + prefix.len()..];
    let id_end = rest.find(|c: char| c.is_whitespace())?;
    Some(rest[..id_end].to_string())
}

fn format_price(price: f64) -> String {
    let total_cents = (price * 100.0).round() as i64;
    let pesos = total_cents / 100;
    let centavos = total_cents % 100;

    let pesos_str = pesos.to_string();
    let mut formatted = String::new();
    let len = pesos_str.len();

    for (i, c) in pesos_str.chars().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            formatted.push('.');
        }
        formatted.push(c);
    }

    format!("{},{:02}", formatted, centavos)
}

fn build_receipt(order: &OrderReceipt) -> String {
    let now = Local::now();
    let fecha_formatted = now.format("%d/%m/%Y").to_string();

    let hora_formatted = if order.hora.len() >= 5 {
        &order.hora[0..5]
    } else {
        &order.hora
    };

    let total_formatted = format_price(order.total);

    format!(
        "Oh My Dog\nOrden: #{:02}\nFecha: {}\nHora: {}\n----------\n{}\n----------\nTotal: ${}\nPago: {}\n----------\nDireccion:\n{}\n\n\n\n\n",
        order.numero,
        fecha_formatted,
        hora_formatted,
        order.items,
        total_formatted,
        order.metodo_pago,
        order.zona
    )
}
