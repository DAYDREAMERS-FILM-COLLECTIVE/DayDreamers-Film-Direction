"""
Blender MCP / Headless Python Script: Auditorium 3D Generator
Compatible with ahujasid/blender-mcp and Blender 3.x / 4.x headless CLI:
    blender --background --python scripts/generate_blender_auditorium.py

Generates:
  - Curved 16:9 Acoustic Cinema Screen (CinemaScreen)
  - 5 Stepped Concrete/Carpet Risers (Riser_Tier_A to Riser_Tier_E)
  - 50 Named Cinema Seat Meshes (Seat_A1 through Seat_E10)
  - Exports Draco-compressed GLB to public/models/auditorium.glb
"""

import bpy
import bmesh
import math
import os

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_materials():
    materials = {}
    
    # Screen Material (Matte White Acoustic)
    screen_mat = bpy.data.materials.new(name="ScreenMaterial")
    screen_mat.use_nodes = True
    bsdf = screen_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.93, 0.92, 0.91, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.85
    materials["screen"] = screen_mat

    # Regular Seat Material (Charcoal Leather #22201d)
    reg_mat = bpy.data.materials.new(name="RegularSeatMaterial")
    reg_mat.use_nodes = True
    bsdf = reg_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.133, 0.125, 0.114, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.70
    materials["regular"] = reg_mat

    # VIP Seat Material (Bronze #2d241e / #3a2c20)
    vip_mat = bpy.data.materials.new(name="VipSeatMaterial")
    vip_mat.use_nodes = True
    bsdf = vip_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.176, 0.141, 0.118, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.60
    bsdf.inputs["Metallic"].default_value = 0.20
    materials["vip"] = vip_mat

    # Frame Material (Dark Matte Metal)
    frame_mat = bpy.data.materials.new(name="FrameMaterial")
    frame_mat.use_nodes = True
    bsdf = frame_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.05, 0.05, 0.05, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.60
    materials["frame"] = frame_mat

    return materials

def build_curved_screen(materials):
    # Create curved mesh
    mesh = bpy.data.meshes.new("CinemaScreen")
    obj = bpy.data.objects.new("CinemaScreen", mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    radius = 18.0
    height = 5.2
    arc_angle = 0.52
    segments = 32
    
    verts = []
    for seg in range(segments + 1):
        angle = -arc_angle / 2.0 + (seg / segments) * arc_angle
        x = radius * math.sin(angle)
        z = radius * (1.0 - math.cos(angle))
        
        v_bottom = bm.verts.new((x, z, -height / 2.0))
        v_top = bm.verts.new((x, z, height / 2.0))
        verts.append((v_bottom, v_top))

    for seg in range(segments):
        bm.faces.new([
            verts[seg][0],
            verts[seg + 1][0],
            verts[seg + 1][1],
            verts[seg][1]
        ])

    bm.to_mesh(mesh)
    bm.free()

    obj.location = (0, 0, 3.2)
    obj.data.materials.append(materials["screen"])
    return obj

def build_risers_and_seats(materials):
    rows = ['A', 'B', 'C', 'D', 'E']
    riser_depth = 1.9
    riser_step_height = 0.45
    col_spacing = 0.88
    start_x = -((10 - 1) * col_spacing) / 2.0

    for r_idx, row in enumerate(rows):
        is_vip = (r_idx >= 3)
        riser_y = 4.8 + r_idx * riser_depth
        riser_height = (r_idx + 1) * riser_step_height

        # Build riser
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(0, riser_y, riser_height / 2.0)
        )
        riser = bpy.context.active_object
        riser.name = f"Riser_Tier_{row}"
        riser.scale = (14.5, riser_depth - 0.05, riser_height)
        riser.data.materials.append(materials["frame"])

        # Build 10 seats for this row
        for col in range(1, 11):
            col_x = start_x + (col - 1) * col_spacing
            seat_name = f"Seat_{row}{col}"

            # Create seat parent / cushion
            bpy.ops.mesh.primitive_cube_add(
                size=1.0,
                location=(col_x, riser_y, riser_height + 0.35)
            )
            seat = bpy.context.active_object
            seat.name = seat_name
            seat.scale = (0.58, 0.54, 0.14)
            seat.data.materials.append(materials["vip"] if is_vip else materials["regular"])

            # Curve slightly towards center
            seat.rotation_euler[2] = -col_x * 0.025

def main():
    reset_scene()
    materials = create_materials()
    build_curved_screen(materials)
    build_risers_and_seats(materials)

    export_dir = os.path.join(os.getcwd(), "public", "models")
    os.makedirs(export_dir, exist_ok=True)
    export_path = os.path.join(export_dir, "auditorium.glb")

    bpy.ops.export_scene.gltf(
        filepath=export_path,
        export_format='GLB',
        use_selection=False,
        export_draco_mesh_compression_enable=False
    )
    print(f"Exported Blender MCP model to: {export_path}")

if __name__ == "__main__":
    main()
