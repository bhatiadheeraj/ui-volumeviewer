/**
 * UI to display t1 volumes using https://brainbrowser.cbrain.mcgill.ca/
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
        task_id = "595fcb7c0f3f5d43e5bf2c95";
        config.wf_api = "https://dev1.soichi.us/api/wf";
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
                /**
                 * Load array buffer data from t1.nii.gz
                 * Inflate array buffer
                 * Create a blob from the inflated buffer
                 * Create an object url from the blob
                 * Use the url as the link to the uncompressed nii
                 */
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
                var container = $(event.container),
                    volume = event.volume,
                    vol_id = event.volume_id;

                // The world coordinate input fields.
                container.find(".world-coords").change(function() {
                    var div = $(this);

                    // Set coordinates and redraw.
                    volume.setWorldCoords(+div.find("#world-x-" + vol_id).val(),
                                          +div.find("#world-y-" + vol_id).val(),
                                          +div.find("#world-z-" + vol_id).val());
                    viewer.redrawVolumes();
                });

                // The world coordinate input fields.
                container.find(".voxel-coords").change(function() {
                    var div = $(this);

                    // Set coordinates and redraw.
                    volume.setVoxelCoords(parseInt(div.find("#voxel-i-" + vol_id).val(), 10),
                                          parseInt(div.find("#voxel-j-" + vol_id).val(), 10),
                                          parseInt(div.find("#voxel-k-" + vol_id).val(), 10));
                    viewer.redrawVolumes();
                });
                
                // Change the range of intensities that will be displayed.
                container.find(".threshold-div").each(function() {
                    var div = $(this);

                    // Input fields to input min and max thresholds directly.
                    var min_input = div.find("#min-threshold-" + vol_id),
                        max_input = div.find("#max-threshold-" + vol_id);

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
                        this.value = Math.max(volume.getVoxelMin(), Math.min(+this.value, volume.getVoxelMax()));

                        // Update the slider.
                        slider.slider("values", 0, this.value);

                        // Update the volume and redraw.
                        volume.intensity_min = this.value;
                        viewer.redrawVolumes();
                    });

                    // Input field for maximun threshold.
                    max_input.change(function() {
                        this.value = Math.max(volume.getVoxelMin(), Math.min(+this.value, volume.getVoxelMax()));

                        // Update the slider.
                        slider.slider("values", 1, this.value);

                        // Update the volume and redraw.
                        volume.intensity_max = this.value;
                        viewer.redrawVolumes();
                    });

                });

                // Blend controls for a multivolume overlay.
                container.find(".blend-div").each(function() {
                    var div = $(this),
                        slider = div.find(".slider"),
                        blend_input = div.find("#blend-val");

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
                        this.value = Math.max(0, Math.min(+this.value, 1));

                        // Update slider and redraw volumes.
                        slider.slider("value", this.value);
                        volume.blend_ratios[0] = 1 - this.value;
                        volume.blend_ratios[1] = this.value;
                        viewer.redrawVolumes();
                    });
                });

                // Contrast controls
                container.find(".contrast-div").each(function() {
                    var div = $(this),
                        slider = div.find(".slider"),
                        contrast_input = div.find("#contrast-val");

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
                        this.value = Math.max(0, Math.min(+this.value, 2));

                        // Update slider and redraw volumes.
                        slider.slider("value", this.value);
                        volume.display.setContrast(this.value);
                        volume.display.refreshPanels();
                        viewer.redrawVolumes();
                    });
                });

                // Contrast controls
                container.find(".brightness-div").each(function() {
                    var div = $(this),
                        slider = div.find(".slider"),
                        brightness_input = div.find("#brightness-val");

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
                        this.value = Math.max(-1, Math.min(+this.value, 1));

                        // Update slider and redraw volumes.
                        slider.slider("value", this.value);
                        volume.display.setBrightness(this.value);
                        volume.display.refreshPanels();
                        viewer.redrawVolumes();
                    });
                });
            });

            // UI updates to be performed after each slice update.
            viewer.addEventListener("sliceupdate", function(event) {
                var panel = event.target,
                    volume = event.volume,
                    vol_id = panel.volume_id,
                    world_coords, voxel_coords,
                    value = volume.getIntensityValue();

                if (typeof volume.getWorldCoords == 'function') {
                    world_coords = volume.getWorldCoords();
                    
                    $("#world-x-" + vol_id).val(world_coords.x.toPrecision(6));
                    $("#world-y-" + vol_id).val(world_coords.y.toPrecision(6));
                    $("#world-z-" + vol_id).val(world_coords.z.toPrecision(6));
                }

                if (typeof volume.getVoxelCoords == 'function') {
                    voxel_coords = volume.getVoxelCoords();
                    
                    $("#voxel-i-" + vol_id).val(parseInt(voxel_coords.i, 10));
                    $("#voxel-j-" + vol_id).val(parseInt(voxel_coords.j, 10));
                    $("#voxel-k-" + vol_id).val(parseInt(voxel_coords.k, 10));
                }
                
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

