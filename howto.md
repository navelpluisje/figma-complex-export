## How to use the plugin

### Install

- In your favorite browser visit: [Slider Creator](https://www.figma.com/community/plugin/1275561670400781749/Slider-Creator)
- Or, search in your App for `Slider Creator` in the Community area
- Click the install button

Congrats, that's step 1.

### Usage

#### intro

Slider Creator uses a frame or group as a base node. If you want a group to be a slider stack, the plugin will move it into a newly created frame.
Within the group you can have your separate layers to build your knob out of. Deciding which layer to slide is managed by naming. There are 4 keywords to start your layer name with:

#### Project setup

Projects can have multiple pages. It is not required of course, but wil probably help you structure your project.
Within a page you can add one or more frames. Each frame can contain multiple images for export. Per Frame you can set the export information; Which folder should it end up in and which scale levels do you need.

<img src="assets/plugin-folder-structure.png" style="width: 50%;">

In the image an example:
The page mcp has a couple of frames. One of the frames is named default and has 3 other frames as children. The children have export info:

- export to folder `root` with scale `1`
- export to folder `200` with scale `2`

The above will get applied to all the children of this frame.

#### Export options

For the folders there are 2 options to add and these are 'aligned'.

The first one is the folder. This looks like:

- `(folder=root)`: This will export the images to the root folder. This is the top level folder. When only having 1 folder and the scale option is not set, all images will be scaled to 100%.
- `(folder=root,200)`: This will export the images to both the root folder and a folder named 200. Having multiple folders requires also the scale option.

The second one is the scale. This looks like:

- `(scale=2)`: This will scale all the images to 200%.
- `(scale=1,2)`: This will scale all the images to 100% and 200% for the corresponding folders.

And now all together:

- `(folder=root,200) (scale=1,2)`: This will move all images to the root folder scaled by 100% and also moves all the images to a folder named 200, scaled by 200%
- `(folder=root,200/default) (scale=2,2)`: This will move all images to the root folder and a folder named 200/default, scaled by 200%

#### Image sizing meta data

In some application you are able to add image sizing metadata in the image. The consists of a 1px border in some places. These define which areas of an image may or may not scale. more info on this can be found on the [REAPER](https://www.reaper.fm/sdk/walter/images.php#imagetypes) website.

#### Export the images

- Build upon pages. In the plugin you can select the pages to export
  ![Select pages](/assets/plugin-page-select.png)
- Select the pages to export
  ![Select pages](/assets/plugin-page-selected.png)

- Click the generate button. All data wil be prepared. A list of all the folders to generate will displayed. Clicking on the folder name will show a list with all the images inside the folder
  ![Select pages](/assets/plugin-download-list.png)

- Click start download to start the actual download
