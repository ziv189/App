# Renders one frame of a flashlight-lit, fogged test scene through Forward+ and saves it as a PNG.
# Usage: godot --path tools/setup/smoke --script res://smoke.gd -- OUT.png
extends SceneTree

const FRAMES_BEFORE_CAPTURE := 12  # lets volumetric fog and shadows settle

var _frames := 0
var _out_path := "user://smoke.png"


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		_out_path = args[0]

	var world := Node3D.new()
	root.add_child(world)

	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.015, 0.017, 0.022)
	env.volumetric_fog_enabled = true
	env.volumetric_fog_density = 0.04
	if ClassDB.class_has_integer_constant(&"Environment", &"TONE_MAPPER_AGX"):
		env.tonemap_mode = ClassDB.class_get_integer_constant(&"Environment", &"TONE_MAPPER_AGX")
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	world.add_child(world_env)

	var floor_mesh := PlaneMesh.new()
	floor_mesh.size = Vector2(12, 12)
	var floor := MeshInstance3D.new()
	floor.mesh = floor_mesh
	world.add_child(floor)

	var box := MeshInstance3D.new()
	box.mesh = BoxMesh.new()
	box.position = Vector3(0, 0.5, 0)
	world.add_child(box)

	var flashlight := SpotLight3D.new()
	world.add_child(flashlight)
	flashlight.look_at_from_position(Vector3(1.4, 1.5, 2.2), Vector3(0, 0.5, 0))
	flashlight.spot_angle = 16.0
	flashlight.spot_range = 12.0
	flashlight.light_energy = 12.0
	flashlight.shadow_enabled = true

	var camera := Camera3D.new()
	world.add_child(camera)
	camera.look_at_from_position(Vector3(-0.6, 1.3, 4.2), Vector3(0, 0.5, 0))
	camera.fov = 37.8  # the 35 mm lens from brief §5.1
	camera.current = true


func _process(_delta: float) -> bool:
	_frames += 1
	if _frames < FRAMES_BEFORE_CAPTURE:
		return false
	var image := root.get_texture().get_image()
	var err := image.save_png(_out_path)
	print("smoke: renderer=%s | adapter=%s | api=%s | agx=%s | %dx%d | save=%s" % [
		ProjectSettings.get_setting("rendering/renderer/rendering_method"),
		RenderingServer.get_video_adapter_name(),
		RenderingServer.get_video_adapter_api_version(),
		ClassDB.class_has_integer_constant(&"Environment", &"TONE_MAPPER_AGX"),
		image.get_width(), image.get_height(), error_string(err)])
	return true
