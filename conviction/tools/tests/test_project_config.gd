# Checks, inside the running engine, that the project configuration from tools/pipeline/configure_project.gd
# took effect: settings, layer names, the input map, and the audio bus layout as the AudioServer loaded it.
# Run: tools/tests/run_tests.sh
extends SceneTree

const ACTIONS_WITH_KEYBOARD_OR_MOUSE := [
	"move_forward", "move_back", "move_left", "move_right", "interact", "crouch", "flashlight",
	"strike", "dodge", "shoulder_swap", "inventory", "pause"]
const GAMEPAD_ONLY_ACTIONS := ["look_left", "look_right", "look_up", "look_down"]  # mouse look is read in code
const BUSES := [
	"Master", "Dialogue", "Music", "SFX", "Ambience", "UI", "Reverb_SmallApartment", "Reverb_LongHallway",
	"Reverb_Stairwell", "Reverb_SquadRoom", "Reverb_Cemetery", "Reverb_Basement", "Reverb_TheRoom"]

var _failures: Array[String] = []


func _initialize() -> void:
	_check_settings()
	_check_input_map()
	_check_buses()
	for failure in _failures:
		printerr("test_project_config: FAIL: " + failure)
	print("test_project_config: %s" % ("PASS" if _failures.is_empty() else "%d failure(s)" % _failures.size()))
	quit(0 if _failures.is_empty() else 1)


func _expect(condition: bool, message: String) -> void:
	if not condition:
		_failures.append(message)


func _check_settings() -> void:
	var expected := {
		"rendering/renderer/rendering_method": "forward_plus",
		"rendering/lights_and_shadows/use_physical_light_units": true,
		"physics/3d/physics_engine": "Jolt Physics",
		"display/window/size/viewport_width": 1920,
		"display/window/size/viewport_height": 1080,
		"display/window/stretch/mode": "canvas_items",
		"display/window/stretch/aspect": "expand",
		"layer_names/3d_render/layer_2": "ward",
	}
	for setting: String in expected:
		var actual: Variant = ProjectSettings.get_setting(setting)
		_expect(actual == expected[setting], "%s is %s, expected %s" % [setting, actual, expected[setting]])


func _check_input_map() -> void:
	for action: String in ACTIONS_WITH_KEYBOARD_OR_MOUSE + GAMEPAD_ONLY_ACTIONS:
		if not InputMap.has_action(action):
			_failures.append("input action %s is missing" % action)
			continue
		var has_desktop := false
		var has_gamepad := false
		for event in InputMap.action_get_events(action):
			has_desktop = has_desktop or event is InputEventKey or event is InputEventMouseButton
			has_gamepad = has_gamepad or event is InputEventJoypadButton or event is InputEventJoypadMotion
		_expect(has_gamepad, "input action %s has no gamepad binding (brief §9.9)" % action)
		if action in ACTIONS_WITH_KEYBOARD_OR_MOUSE:
			_expect(has_desktop, "input action %s has no keyboard or mouse binding" % action)


func _check_buses() -> void:
	_expect(AudioServer.bus_count == BUSES.size(), "%d audio buses, expected %d" % [AudioServer.bus_count, BUSES.size()])
	for index in range(mini(AudioServer.bus_count, BUSES.size())):
		_expect(AudioServer.get_bus_name(index) == BUSES[index],
			"bus %d is %s, expected %s" % [index, AudioServer.get_bus_name(index), BUSES[index]])
		if index > 0:
			_expect(AudioServer.get_bus_send(index) == &"Master", "bus %s doesn't send to Master" % BUSES[index])

	_expect(_bus_effect(0) is AudioEffectHardLimiter, "Master has no hard limiter")
	for ducked in ["Music", "Ambience"]:
		var duck := _bus_effect(AudioServer.get_bus_index(ducked)) as AudioEffectCompressor
		_expect(duck != null and duck.sidechain == &"Dialogue", "%s isn't ducked by Dialogue" % ducked)
	for index in range(AudioServer.bus_count):
		var bus_name := AudioServer.get_bus_name(index)
		if bus_name.begins_with("Reverb_"):
			var reverb := _bus_effect(index) as AudioEffectReverb
			_expect(reverb != null and is_equal_approx(reverb.wet, 1.0) and is_zero_approx(reverb.dry),
				"%s isn't a fully wet reverb send" % bus_name)


func _bus_effect(bus: int) -> AudioEffect:
	return AudioServer.get_bus_effect(bus, 0) if bus >= 0 and AudioServer.get_bus_effect_count(bus) > 0 else null
