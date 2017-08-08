/**
 * UI to display 
 */

'use strict';
$(function() {
    
    var config = {
        wf_api: '/api/wf',
        jwt: localStorage.getItem('jwt'),
        debug: true,
    };

    var url = new URL(window.location.href);
    var task_id = url.searchParams.get('task');
    var subdir = url.searchParams.get('sdir');

    if(config.debug) {
        task_id = "59838f6f841a822e8b3872e0";
        // subdir = "output";
        config.wf_api = "https://brainlife.duckdns.org/api/wf";
    }

    if (!config.jwt) {
        alert("Error: jwt not set");
        return;
    }
    
    //load task detail
    $.ajax({
        beforeSend: xhr => xhr.setRequestHeader('Authorization', 'Bearer '+config.jwt),
        url: config.wf_api+'/task',
        data: {
            find: JSON.stringify({ _id: task_id })
        },
        success: data => {
            init(data.tasks[0]);
        },
        error: console.error
    });
    
    function init(task) {
        BrainBrowser.VolumeViewer.start("view", function(viewer) {
            viewer.loadDefaultColorMapFromURL('color_maps/gray_scale.txt', '#ff0000');
            
            //load t1 and pass it to volume viewer
            var base = task.instance_id + '/' + task._id;
            if (subdir) base += '/' + subdir;
            
            fetch(config.wf_api + "/resource/download?r=" + task.resource_id +
                  "&p="+encodeURIComponent(base+"/t1.nii.gz") +
                  "&at="+config.jwt)
            .then(res => res.arrayBuffer())
            .then(t1_buff => {
                // load the nifti from the downloaded array buffer
                viewer.loadVolumes({
                    volumes: [{
                        type: 'nifti1',
                        nii_url: URL.createObjectURL( new Blob([ pako.inflate(t1_buff) ]) ),
                        template: {
                            element_id: 'volume-ui-template',
                            viewer_insert_class: 'volume-viewer-display'
                        }
                    }],
                    overlay: {
                        template: {
                            element_id: 'overlay-ui-template',
                            viewer_insert_class: 'overlay-viewer-display'
                        }
                    }
                });
            });
            
            // resize the display panels when the window is resized
            function resized() {
                var view_element = document.getElementById("view");
                var width_on_three = window.innerWidth / 3;
                
                viewer.setPanelSize(width_on_three, width_on_three, { scale_image: true });
                viewer.redrawVolumes();
            }
            viewer.addEventListener('volumesloaded', resized);
            window.addEventListener('resize', resized);
            
            viewer.render();
            
            initEvents(viewer);
        });
        
        function initEvents(viewer) {
            
            // brightness handling
            viewer.addEventListener("volumeuiloaded", function(event) {
                var container = event.container;
                var volume = event.volume;
                var vol_id = event.volume_id;

                container = $(container);

                // The world coordinate input fields.
                container.find(".world-coords").change(function() {
                    var div = $(this);

                    var x = +div.find("#world-x-" + vol_id).val();
                    var y = +div.find("#world-y-" + vol_id).val();
                    var z = +div.find("#world-z-" + vol_id).val();

                    // Set coordinates and redraw.
                    volume.setWorldCoords(x, y, z);
                    viewer.redrawVolumes();
                });

                // The world coordinate input fields.
                container.find(".voxel-coords").change(function() {
                    var div = $(this);

                    var i = parseInt(div.find("#voxel-i-" + vol_id).val(), 10);
                    var j = parseInt(div.find("#voxel-j-" + vol_id).val(), 10);
                    var k = parseInt(div.find("#voxel-k-" + vol_id).val(), 10);

                    // Set coordinates and redraw.
                    volume.setVoxelCoords(i, j, k);
                    viewer.redrawVolumes();
                });

                // Color map URLs are read from the config file and added to the
                // color map select box.
                // var color_map_select = $('<select id="color-map-select"></select>').change(function() {
                //     var selection = $(this).find(":selected");

                //     viewer.loadVolumeColorMapFromURL(vol_id, selection.val(), selection.data("cursor-color"), function() {
                //     viewer.redrawVolumes();
                //     });
                // });

                // BrainBrowser.config.get("color_maps").forEach(function(color_map) {
                //     color_map_select.append('<option value="' + color_map.url +
                //     '" data-cursor-color="' + color_map.cursor_color + '">' +
                //     color_map.name +'</option>'
                //     );
                // });

                // $("#color-map-" + vol_id).append(color_map_select);

                // Load a color map select by the user.
                // container.find(".color-map-file").change(function() {
                //     viewer.loadVolumeColorMapFromFile(vol_id, this, "#FF0000", function() {
                //     viewer.redrawVolumes();
                //     });
                // });

                // Change the range of intensities that will be displayed.
                container.find(".threshold-div").each(function() {
                    var div = $(this);

                    // Input fields to input min and max thresholds directly.
                    var min_input = div.find("#min-threshold-" + vol_id);
                    var max_input = div.find("#max-threshold-" + vol_id);

                    // Slider to modify min and max thresholds.
                    var slider = div.find(".slider");

                    // Update the input fields.
                    min_input.val(volume.getVoxelMin());
                    max_input.val(volume.getVoxelMax());

                    slider.slider({
                        range: true,
                        min: volume.getVoxelMin(),
                        max: volume.getVoxelMax(),
                        values: [volume.getVoxelMin(),volume.getVoxelMax()],
                        step: 1,
                        slide: function(event, ui){
                            var values = ui.values;

                            // Update the input fields.
                            min_input.val(values[0]);
                            max_input.val(values[1]);

                            // Update the volume and redraw.
                            volume.intensity_min = values[0];
                            volume.intensity_max = values[1];
                            viewer.redrawVolumes();
                        },
                        stop: function() {
                            $(this).find("a").blur();
                        }
                    });

                    // Input field for minimum threshold.
                    min_input.change(function() {
                        var value = +this.value;

                        value = Math.max(volume.getVoxelMin(), Math.min(value, volume.getVoxelMax()));
                        this.value = value;

                        // Update the slider.
                        slider.slider("values", 0, value);

                        // Update the volume and redraw.
                        volume.intensity_min = value;
                        viewer.redrawVolumes();
                    });

                    // Input field for maximun threshold.
                    max_input.change(function() {
                        var value = +this.value;

                        value = Math.max(volume.getVoxelMin(), Math.min(value, volume.getVoxelMax()));
                        this.value = value;

                        // Update the slider.
                        slider.slider("values", 1, value);

                        // Update the volume and redraw.
                        volume.intensity_max = value;
                        viewer.redrawVolumes();
                    });

                });

                // container.find(".time-div").each(function() {
                //     var div = $(this);

                //     if (volume.header.time) {
                //     div.show();
                //     } else {
                //     return;
                //     }

                //     var slider = div.find(".slider");
                //     var time_input = div.find("#time-val-" + vol_id);
                //     var play_button = div.find("#play-" + vol_id);

                //     var min = 0;
                //     var max = volume.header.time.space_length - 1;
                //     var play_interval;

                //     slider.slider({
                //     min: min,
                //     max: max,
                //     value: 0,
                //     step: 1,
                //     slide: function(event, ui) {
                //         var value = +ui.value;
                //         time_input.val(value);
                //         volume.current_time = value;
                //         viewer.redrawVolumes();
                //     },
                //     stop: function() {
                //         $(this).find("a").blur();
                //     }
                //     });

                //     time_input.change(function() {
                //     var value = parseInt(this.value, 10);
                //     if (!BrainBrowser.utils.isNumeric(value)) {
                //         value = 0;
                //     }

                //     value = Math.max(min, Math.min(value, max));

                //     this.value = value;
                //     time_input.val(value);
                //     slider.slider("value", value);
                //     volume.current_time = value;
                //     viewer.redrawVolumes();
                //     });

                //     play_button.change(function() {
                //     if(play_button.is(":checked")){
                //         clearInterval(play_interval);
                //         play_interval = setInterval(function() {
                //         var value = volume.current_time + 1;
                //         value = value > max ? 0 : value;
                //         volume.current_time = value;
                //         time_input.val(value);
                //         slider.slider("value", value);
                //         viewer.redrawVolumes();
                //         }, 200);
                //     } else {
                //         clearInterval(play_interval);
                //     }
                //     });

                // });

                // Create an image of all slices in a certain
                // orientation.
                // container.find(".slice-series-div").each(function() {
                //     var div = $(this);

                //     var space_names = {
                //     xspace: "Sagittal",
                //     yspace: "Coronal",
                //     zspace: "Transverse"
                //     };

                //     div.find(".slice-series-button").click(function() {
                //     var axis_name = $(this).data("axis");
                //     var axis = volume.header[axis_name];
                //     var space_length = axis.space_length;
                //     var time = volume.current_time;
                //     var per_column = 10;
                //     var zoom = 0.5;
                //     var i, x, y;

                //     // Canvas on which to draw the images.
                //     var canvas = document.createElement("canvas");
                //     var context = canvas.getContext("2d");

                //     // Get first slice to set dimensions of the canvas.
                //     var image_data = volume.getSliceImage(volume.slice(axis_name, 0, time), zoom);
                //     var img = new Image();
                //     canvas.width = per_column * image_data.width;
                //     canvas.height = Math.ceil(space_length / per_column) * image_data.height;
                //     context.fillStyle = "#000000";
                //     context.fillRect(0, 0, canvas.width, canvas.height);

                //     // Draw the slice on the canvas.
                //     context.putImageData(image_data, 0, 0);

                //     // Draw the rest of the slices on the canvas.
                //     for (i = 1; i < space_length; i++) {
                //         image_data = volume.getSliceImage(volume.slice(axis_name, i, time), zoom);
                //         x = i % per_column * image_data.width;
                //         y = Math.floor(i / per_column) * image_data.height;
                //         context.putImageData(image_data, x, y);
                //     }

                //     // Retrieve image from canvas and display it
                //     // in a dialog box.
                //     img.onload = function() {
                //         $("<div></div>").append(img).dialog({
                //         title: space_names[axis_name] + " Slices",
                //         height: 600,
                //         width: img.width
                //         });
                //     };

                //     img.src = canvas.toDataURL();
                //     });
                // });

                // Blend controls for a multivolume overlay.
                container.find(".blend-div").each(function() {
                    var div = $(this);
                    var slider = div.find(".slider");
                    var blend_input = div.find("#blend-val");

                    // Slider to select blend value.
                    slider.slider({
                        min: 0,
                        max: 1,
                        step: 0.01,
                        value: 0.5,
                        slide: function(event, ui) {
                            var value = +ui.value;
                            volume.blend_ratios[0] = 1 - value;
                            volume.blend_ratios[1] = value;

                            blend_input.val(value);
                            viewer.redrawVolumes();
                        },
                        stop: function() {
                            $(this).find("a").blur();
                        }
                    });

                    // Input field to select blend values explicitly.
                    blend_input.change(function() {
                        var value = parseFloat(this.value);

                        value = Math.max(0, Math.min(value, 1));
                        this.value = value;

                        // Update slider and redraw volumes.
                        slider.slider("value", value);
                        volume.blend_ratios[0] = 1 - value;
                        volume.blend_ratios[1] = value;
                        viewer.redrawVolumes();
                    });
                });

                // Contrast controls
                container.find(".contrast-div").each(function() {
                    var div = $(this);
                    var slider = div.find(".slider");
                    var contrast_input = div.find("#contrast-val");

                    // Slider to select contrast value.
                    slider.slider({
                        min: 0,
                        max: 2,
                        step: 0.05,
                        value: 1,
                        slide: function(event, ui) {
                            var value = +ui.value;
                            volume.display.setContrast(value);
                            volume.display.refreshPanels();

                            contrast_input.val(value);
                        },
                        stop: function() {
                            $(this).find("a").blur();
                        }
                    });

                    // Input field to select contrast values explicitly.
                    contrast_input.change(function() {
                        var value = +this.value;

                        value = Math.max(0, Math.min(value, 2));
                        this.value = value;

                        // Update slider and redraw volumes.
                        slider.slider("value", value);
                        volume.display.setContrast(value);
                        volume.display.refreshPanels();
                        viewer.redrawVolumes();
                    });
                });

                // Contrast controls
                container.find(".brightness-div").each(function() {
                    var div = $(this);
                    var slider = div.find(".slider");
                    var brightness_input = div.find("#brightness-val");

                    // Slider to select brightness value.
                    slider.slider({
                        min: -1,
                        max: 1,
                        step: 0.05,
                        value: 0,
                        slide: function(event, ui) {
                            var value = +ui.value;
                            volume.display.setBrightness(value);
                            volume.display.refreshPanels();

                            brightness_input.val(value);
                        },
                        stop: function() {
                            $(this).find("a").blur();
                        }
                    });

                    // Input field to select brightness values explicitly.
                    brightness_input.change(function() {
                        var value = +this.value;

                        value = Math.max(-1, Math.min(value, 1));
                        this.value = value;

                        // Update slider and redraw volumes.
                        slider.slider("value", value);
                        volume.display.setBrightness(value);
                        volume.display.refreshPanels();
                        viewer.redrawVolumes();
                    });
                });
            });

            /////////////////////////////////////////////////////
            // UI updates to be performed after each slice update.
            //////////////////////////////////////////////////////
            viewer.addEventListener("sliceupdate", function(event) {
                var panel = event.target;
                var volume = event.volume;
                var vol_id = panel.volume_id;
                var world_coords, voxel_coords;
                var value;

                if (BrainBrowser.utils.isFunction(volume.getWorldCoords)) {
                    world_coords = volume.getWorldCoords();
                    $("#world-x-" + vol_id).val(world_coords.x.toPrecision(6));
                    $("#world-y-" + vol_id).val(world_coords.y.toPrecision(6));
                    $("#world-z-" + vol_id).val(world_coords.z.toPrecision(6));
                }

                if (BrainBrowser.utils.isFunction(volume.getVoxelCoords)) {
                    voxel_coords = volume.getVoxelCoords();
                    $("#voxel-i-" + vol_id).val(parseInt(voxel_coords.i, 10));
                    $("#voxel-j-" + vol_id).val(parseInt(voxel_coords.j, 10));
                    $("#voxel-k-" + vol_id).val(parseInt(voxel_coords.k, 10));
                }

                value = volume.getIntensityValue();
                
                $("#intensity-value-" + vol_id)
                .css("background-color", "#" + volume.color_map.colorFromValue(value, {
                    hex: true,
                    min: volume.min,
                    max: volume.max,
                    contrast: panel.contrast,
                    brightness: panel.brightness
                }))
                .html(Math.floor(value));

                if (volume.header && volume.header.time) {
                    $("#time-slider-" + vol_id).slider("option", "value", volume.current_time);
                    $("#time-val-" + vol_id).val(volume.current_time);
                }
            });
            
        }
    }
    
});

