from PIL import Image

# Open the master sheet you uploaded
img = Image.open("Gemini_Generated_Image_1uabry1uabry1uab.jpg")

# Define the coordinates for one of the assets (example: icon_hd)
# You can repeat this for each box on the grid
icon_hd = img.crop((20, 20, 356, 230)) 
icon_hd.save("icon_hd.png")

print("Asset extracted!")
