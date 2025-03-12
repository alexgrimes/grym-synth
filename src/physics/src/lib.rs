use nalgebra as na;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::sync::atomic::{AtomicUsize, Ordering};
use rayon::prelude::*;

// Enable better error messages in debug mode
#[cfg(debug_assertions)]
#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Vector3 {
    x: f64,
    y: f64,
    z: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ParameterField {
    position: Vector3,
    strength: f64,
    radius: f64,
    decay: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Parameter {
    id: String,
    position: Vector3,
    velocity: Vector3,
    mass: f64,
}

#[wasm_bindgen]
pub struct PhysicsWorld {
    fields: Vec<ParameterField>,
    parameters: Vec<Parameter>,
    time_step: f64,
    gravity_constant: f64,
    damping: f64,
}

#[wasm_bindgen]
impl PhysicsWorld {
    #[wasm_bindgen(constructor)]
    pub fn new(time_step: f64, gravity_constant: f64, damping: f64) -> Self {
        Self {
            fields: Vec::new(),
            parameters: Vec::new(),
            time_step,
            gravity_constant,
            damping,
        }
    }

    pub fn add_field(&mut self, field_js: JsValue) -> Result<(), JsValue> {
        let field: ParameterField = serde_wasm_bindgen::from_value(field_js)?;
        self.fields.push(field);
        Ok(())
    }

    pub fn add_parameter(&mut self, param_js: JsValue) -> Result<(), JsValue> {
        let param: Parameter = serde_wasm_bindgen::from_value(param_js)?;
        self.parameters.push(param);
        Ok(())
    }

    pub fn step(&mut self) -> Result<JsValue, JsValue> {
        // Update field strengths
        self.fields.retain_mut(|field| {
            field.strength *= field.decay.powf(self.time_step);
            field.strength > 0.01
        });

        // Parallel parameter updates using rayon
        let chunk_size = (self.parameters.len() / rayon::current_num_threads()).max(1);
        self.parameters.par_chunks_mut(chunk_size).for_each(|chunk| {
            for param in chunk {
                // Calculate total force on parameter
                let mut total_force = na::Vector3::new(0.0, 0.0, 0.0);

                for field in &self.fields {
                    let param_pos = na::Vector3::new(
                        param.position.x,
                        param.position.y,
                        param.position.z
                    );
                    let field_pos = na::Vector3::new(
                        field.position.x,
                        field.position.y,
                        field.position.z
                    );

                    let diff = field_pos - param_pos;
                    let distance = diff.magnitude();

                    if distance < field.radius {
                        let force_magnitude = field.strength * (field.radius - distance) / field.radius;
                        total_force += diff.normalize() * force_magnitude * self.gravity_constant;
                    }
                }

                // Update velocity with damping
                let velocity = na::Vector3::new(
                    param.velocity.x,
                    param.velocity.y,
                    param.velocity.z
                );
                let new_velocity = velocity * (1.0 - self.damping) + total_force * self.time_step;

                // Update position
                param.position.x += new_velocity.x * self.time_step;
                param.position.y += new_velocity.y * self.time_step;
                param.position.z += new_velocity.z * self.time_step;

                // Update velocity
                param.velocity.x = new_velocity.x;
                param.velocity.y = new_velocity.y;
                param.velocity.z = new_velocity.z;
            }
        });

        // Return updated parameters
        serde_wasm_bindgen::to_value(&self.parameters)
    }

    pub fn get_field_potential(&self, position_js: JsValue) -> Result<f64, JsValue> {
        let position: Vector3 = serde_wasm_bindgen::from_value(position_js)?;
        let pos = na::Vector3::new(position.x, position.y, position.z);

        let total_potential = self.fields.iter().fold(0.0, |acc, field| {
            let field_pos = na::Vector3::new(
                field.position.x,
                field.position.y,
                field.position.z
            );
            let diff = field_pos - pos;
            let distance = diff.magnitude();

            if distance < field.radius {
                acc + field.strength * (1.0 - distance / field.radius)
            } else {
                acc
            }
        });

        Ok(total_potential)
    }

    pub fn get_parameter_count(&self) -> usize {
        self.parameters.len()
    }

    pub fn get_field_count(&self) -> usize {
        self.fields.len()
    }

    pub fn clear_fields(&mut self) {
        self.fields.clear();
    }

    pub fn clear_parameters(&mut self) {
        self.parameters.clear();
    }
}

// Thread-safe global state for performance monitoring
static TOTAL_CALCULATIONS: AtomicUsize = AtomicUsize::new(0);
static CALCULATION_TIME: AtomicUsize = AtomicUsize::new(0);

#[wasm_bindgen]
pub fn get_performance_metrics() -> Result<JsValue, JsValue> {
    let metrics = {
        let total = TOTAL_CALCULATIONS.load(Ordering::Relaxed);
        let time = CALCULATION_TIME.load(Ordering::Relaxed);
        let avg_time = if total > 0 { time as f64 / total as f64 } else { 0.0 };

        serde_wasm_bindgen::to_value(&vec![
            total,
            time,
            (avg_time * 1000.0) as usize // Convert to microseconds
        ])
    };

    // Reset metrics
    TOTAL_CALCULATIONS.store(0, Ordering::Relaxed);
    CALCULATION_TIME.store(0, Ordering::Relaxed);

    metrics
}

// Helper function for WebGL integration
#[wasm_bindgen]
pub fn generate_field_vertices(fields: JsValue) -> Result<Vec<f32>, JsValue> {
    let fields: Vec<ParameterField> = serde_wasm_bindgen::from_value(fields)?;
    let mut vertices = Vec::with_capacity(fields.len() * 24); // 8 vertices per field (cube corners)

    for field in fields {
        // Generate cube vertices for field visualization
        let half_size = field.radius * 0.5;
        let positions = [
            // Front face
            [-half_size, -half_size, half_size],
            [half_size, -half_size, half_size],
            [half_size, half_size, half_size],
            [-half_size, half_size, half_size],
            // Back face
            [-half_size, -half_size, -half_size],
            [-half_size, half_size, -half_size],
            [half_size, half_size, -half_size],
            [half_size, -half_size, -half_size],
        ];

        for [x, y, z] in positions.iter() {
            vertices.push(*x as f32 + field.position.x as f32);
            vertices.push(*y as f32 + field.position.y as f32);
            vertices.push(*z as f32 + field.position.z as f32);
        }
    }

    Ok(vertices)
}
