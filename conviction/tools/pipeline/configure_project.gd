# Writes CONVICTION's project settings, render and physics layer names, input map and audio bus layout.
# Project configuration lives here as code so it can be reviewed, diffed and regenerated; don't hand-edit
# game/project.godot or game/default_bus_layout.tres. Run: tools/pipeline/configure_project.sh
extends SceneTree

const BUS_LAYOUT_PATH := "res://default_bus_layout.tres"

# Brief §9.1, §9.5: keyboard and mouse plus full gamepad support. Keys are physical, so the layout works on
# AZERTY and other keyboards. Day and nightmare actions share buttons where they never coexist (crouch and dodge).
const ACTIONS := {
	"move_forward": {"deadzone": 0.2, "keys": [KEY_W, KEY_UP], "axes": [[JOY_AXIS_LEFT_Y, -1.0]]},
	"move_back": {"deadzone": 0.2, "keys": [KEY_S, KEY_DOWN], "axes": [[JOY_AXIS_LEFT_Y, 1.0]]},
	"move_left": {"deadzone": 0.2, "keys": [KEY_A, KEY_LEFT], "axes": [[JOY_AXIS_LEFT_X, -1.0]]},
	"move_right": {"deadzone": 0.2, "keys": [KEY_D, KEY_RIGHT], "axes": [[JOY_AXIS_LEFT_X, 1.0]]},
	# Mouse look is read from motion events in code, with its own sensitivity setting.
	"look_left": {"deadzone": 0.15, "axes": [[JOY_AXIS_RIGHT_X, -1.0]]},
	"look_right": {"deadzone": 0.15, "axes": [[JOY_AXIS_RIGHT_X, 1.0]]},
	"look_up": {"deadzone": 0.15, "axes": [[JOY_AXIS_RIGHT_Y, -1.0]]},
	"look_down": {"deadzone": 0.15, "axes": [[JOY_AXIS_RIGHT_Y, 1.0]]},
	"interact": {"deadzone": 0.5, "keys": [KEY_E], "buttons": [JOY_BUTTON_A]},
	"crouch": {"deadzone": 0.5, "keys": [KEY_C], "buttons": [JOY_BUTTON_B]},
	# Day: aim the flashlight. Nightmare: LIGHT (hold).
	"flashlight": {"deadzone": 0.3, "mouse": [MOUSE_BUTTON_RIGHT], "axes": [[JOY_AXIS_TRIGGER_LEFT, 1.0]]},
	"strike": {"deadzone": 0.3, "mouse": [MOUSE_BUTTON_LEFT], "axes": [[JOY_AXIS_TRIGGER_RIGHT, 1.0]]},
	"dodge": {"deadzone": 0.5, "keys": [KEY_SPACE], "buttons": [JOY_BUTTON_B]},
	"shoulder_swap": {"deadzone": 0.5, "keys": [KEY_Q], "buttons": [JOY_BUTTON_RIGHT_STICK]},
	"inventory": {"deadzone": 0.5, "keys": [KEY_TAB], "buttons": [JOY_BUTTON_Y]},
	"pause": {"deadzone": 0.5, "keys": [KEY_ESCAPE], "buttons": [JOY_BUTTON_START]},
}

# Brief §8.2: per-room reverb buses. They're pure sends (all wet); Area3D nodes route sounds into them.
# Starting values from the rooms' size and surfaces, to be tuned by ear in the Phase 3 mix check.
const REVERBS := {
	"Reverb_SmallApartment": {"predelay_msec": 10.0, "room_size": 0.35, "damping": 0.6, "spread": 0.7, "hipass": 0.1},
	"Reverb_LongHallway": {"predelay_msec": 25.0, "room_size": 0.6, "damping": 0.35, "spread": 0.9, "hipass": 0.15},
	"Reverb_Stairwell": {"predelay_msec": 30.0, "room_size": 0.8, "damping": 0.25, "spread": 1.0, "hipass": 0.1},
	"Reverb_SquadRoom": {"predelay_msec": 15.0, "room_size": 0.5, "damping": 0.5, "spread": 0.8, "hipass": 0.1},
	"Reverb_Cemetery": {"predelay_msec": 40.0, "room_size": 0.9, "damping": 0.7, "spread": 1.0, "hipass": 0.3},
	"Reverb_Basement": {"predelay_msec": 35.0, "room_size": 0.85, "damping": 0.2, "spread": 1.0, "hipass": 0.05},
	"Reverb_TheRoom": {"predelay_msec": 5.0, "room_size": 0.15, "damping": 0.85, "spread": 0.3, "hipass": 0.2},
}


func _initialize() -> void:
	_general_settings()
	_layer_names()
	_input_map()
	var bus_error := _audio_buses()
	var save_error := ProjectSettings.save()
	if bus_error != OK or save_error != OK:
		printerr("configure_project: failed (bus layout: %s, project.godot: %s)" % [error_string(bus_error), error_string(save_error)])
		quit(1)
		return
	print("configure_project: wrote project.godot (%d input actions) and %s (%d buses)" % [
		ACTIONS.size(), BUS_LAYOUT_PATH, AudioServer.bus_count])
	quit(0)


func _general_settings() -> void:
	ProjectSettings.set_setting("application/config/name", "CONVICTION")
	ProjectSettings.set_setting("application/config/description", "A cinematic noir psychological-horror game.")
	# What the project manager writes for a new Forward+ project; save_custom() keeps it (core/config/project_settings.cpp).
	ProjectSettings.set_setting("application/config/features", PackedStringArray(["4.7", "Forward Plus"]))
	# Reference resolution (brief §3.2). "expand" keeps UI unstretched at 16:10, 21:9 and 4K.
	ProjectSettings.set_setting("display/window/size/viewport_width", 1920)
	ProjectSettings.set_setting("display/window/size/viewport_height", 1080)
	ProjectSettings.set_setting("display/window/stretch/mode", "canvas_items")
	ProjectSettings.set_setting("display/window/stretch/aspect", "expand")
	ProjectSettings.set_setting("rendering/renderer/rendering_method", "forward_plus")
	# Real lux and lumen values, so lights and the physical camera (brief §4.4, §5.1) share one scale.
	ProjectSettings.set_setting("rendering/lights_and_shadows/use_physical_light_units", true)
	# Godot 4.7's defaults for new projects (editor/editor_node.cpp, get_initial_settings).
	ProjectSettings.set_setting("physics/3d/physics_engine", "Jolt Physics")
	ProjectSettings.set_setting("rendering/rendering_device/driver.windows", "d3d12")
	ProjectSettings.set_setting("audio/buses/default_bus_layout", BUS_LAYOUT_PATH)


func _layer_names() -> void:
	# Layer 2 holds only Ward's meshes. Every reflection probe and planar reflection culls it,
	# except the Room's one-way glass (brief §5.5, rule 2).
	ProjectSettings.set_setting("layer_names/3d_render/layer_1", "world")
	ProjectSettings.set_setting("layer_names/3d_render/layer_2", "ward")
	ProjectSettings.set_setting("layer_names/3d_physics/layer_1", "world")
	ProjectSettings.set_setting("layer_names/3d_physics/layer_2", "characters")
	ProjectSettings.set_setting("layer_names/3d_physics/layer_3", "interactables")
	ProjectSettings.set_setting("layer_names/3d_physics/layer_4", "camera_blockers")
	ProjectSettings.set_setting("layer_names/3d_physics/layer_5", "triggers")


func _input_map() -> void:
	for action: String in ACTIONS:
		var spec: Dictionary = ACTIONS[action]
		var events := []  # untyped, matching how the editor stores action events
		for keycode: Key in spec.get("keys", []):
			var key := InputEventKey.new()
			key.device = -1
			key.physical_keycode = keycode
			events.append(key)
		for button: MouseButton in spec.get("mouse", []):
			var mouse := InputEventMouseButton.new()
			mouse.device = -1
			mouse.button_index = button
			events.append(mouse)
		for button: JoyButton in spec.get("buttons", []):
			var joy_button := InputEventJoypadButton.new()
			joy_button.device = -1
			joy_button.button_index = button
			events.append(joy_button)
		for axis: Array in spec.get("axes", []):
			var motion := InputEventJoypadMotion.new()
			motion.device = -1
			motion.axis = axis[0]
			motion.axis_value = axis[1]
			events.append(motion)
		ProjectSettings.set_setting("input/" + action, {"deadzone": spec["deadzone"], "events": events})


# Sub-resources get fixed IDs, so regenerating the layout doesn't change the file unless a value changes.
func _audio_buses() -> Error:
	while AudioServer.bus_count > 1:
		AudioServer.remove_bus(AudioServer.bus_count - 1)
	for effect_index in range(AudioServer.get_bus_effect_count(0) - 1, -1, -1):
		AudioServer.remove_bus_effect(0, effect_index)

	# A brick-wall ceiling on Master, so a loud cue can't clip (brief §8.8).
	var limiter := AudioEffectHardLimiter.new()
	limiter.set_scene_unique_id("limiter_master")
	limiter.ceiling_db = -1.0
	AudioServer.add_bus_effect(0, limiter)

	for bus_name in ["Dialogue", "Music", "SFX", "Ambience", "UI"]:
		_add_bus(bus_name, "Master")
	# Dialogue ducks music and ambience slightly (brief §8.2).
	for ducked in ["Music", "Ambience"]:
		var duck := AudioEffectCompressor.new()
		duck.set_scene_unique_id("duck_" + ducked.to_lower())
		duck.sidechain = &"Dialogue"
		duck.threshold = -24.0
		duck.ratio = 3.0
		duck.attack_us = 2000.0
		duck.release_ms = 400.0
		AudioServer.add_bus_effect(AudioServer.get_bus_index(ducked), duck)

	for bus_name: String in REVERBS:
		var reverb := AudioEffectReverb.new()
		reverb.set_scene_unique_id(bus_name.to_lower())
		for property: String in REVERBS[bus_name]:
			reverb.set(property, REVERBS[bus_name][property])
		reverb.dry = 0.0
		reverb.wet = 1.0
		AudioServer.add_bus_effect(_add_bus(bus_name, "Master"), reverb)

	return ResourceSaver.save(AudioServer.generate_bus_layout(), BUS_LAYOUT_PATH)


func _add_bus(bus_name: String, send: String) -> int:
	AudioServer.add_bus()
	var index := AudioServer.bus_count - 1
	AudioServer.set_bus_name(index, bus_name)
	AudioServer.set_bus_send(index, send)
	return index
