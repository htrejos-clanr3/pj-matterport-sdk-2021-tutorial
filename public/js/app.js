const params = new URLSearchParams(window.location.search);
const modelSid = params.get('model');
const propertyId = params.get('propertyid');

let iframe;
let addTagViviendaBtn;
let addTagSaludBtn;
let sidSelector;
let container;
let tag;
let table_container;
let tagType;
const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
const ENDPOINTS = {
  add: `${BACK_END_APP}/server_add_tag.php?property_id=${propertyId}`,
  list: `${BACK_END_APP}/server_list_tags.php?property_id=${propertyId}`,
  view: `${BACK_END_APP}/server_view_tag.php?property_id=${propertyId}`,
  update: `${BACK_END_APP}/server_update_tag.php?property_id=${propertyId}`,
  delete: `${BACK_END_APP}/server_delete_tag.php?property_id=${propertyId}`,
};

document.addEventListener("DOMContentLoaded", () => {
    iframe = document.querySelector('.showcase');
    tagType=0;
    container = document.querySelector('.showcase_container');
    addTagViviendaBtn = document.querySelector('.add_tag_vivienda');
    addTagSaludBtn = document.querySelector('.add_tag_salud');
    sidSelector = document.getElementById('sid-input');
    table_container = document.querySelector(".scrollable");
    iframe.setAttribute('src', `https://my.matterport.com/show/?m=${modelSid}&help=0&play=1&qs=1&gt=0&hr=0`);
    iframe.addEventListener('load', () => showcaseLoader(iframe));

    sidSelector.setAttribute('value', modelSid);

    sidSelector.addEventListener('keyup', e => {
        if(e.key === "Enter"){
            modelSid = sidSelector.value;
            iframe.setAttribute('src', `https://my.matterport.com/show/?m=${modelSid}&help=0&play=1&qs=1&gt=0&hr=0`);
        }
    });
});

function showcaseLoader(iframe){
    try{
        window.MP_SDK.connect(iframe, sdkKey, '3.10')
        .then(loadedShowcaseHandler)
        .catch(console.error);
    } catch(e){
        console.error(e);
    }
}

function populateTags(tags, sort='label'){
    const curTags = document.querySelectorAll('.scrollable tbody tr');
    curTags.forEach((tag) => {
        tag.remove();
    });
    tags.forEach(addToTable);
}

async function addTagRemote(tagData) {
    try {
        const response = await fetch(ENDPOINTS.add, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({tagData,tagType},(k, v) => v && typeof v === 'object' ? v : '' + v),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Tag added:", result);
            return result;
        } else {
            console.error("Error adding tag:", result);
        }
    } catch (error) {
        console.error("Error in addTag:", error);
    }
}

async function deleteTagRemote(tagId) {
    try {
        const response = await fetch(ENDPOINTS.delete, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: tagId }),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Tags deleted:", result);
            return result;
        } else {
            console.error("Error deleting tags:", result);
        }
    } catch (error) {
        console.error("Error in deleteTags:", error);
    }
}

async function updateTagRemote(tagId, updateData) {
    try {
        const response = await fetch(ENDPOINTS.update, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: tagId, ...updateData }),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Tag updated:", result);
            return result;
        } else {
            console.error("Error updating tag:", result);
        }
    } catch (error) {
        console.error("Error in updateTag:", error);
    }
}
async function viewTagRemote(tagId) {
    try {
        const response = await fetch(ENDPOINTS.view, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: tagId}),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Tag viewed:", result);
            return result;
        } else {
            console.error("Error viewing tag:", result);
        }
    } catch (error) {
        console.error("Error in viewTag:", error);
    }
}

function addToTable(tag){
    let elem;
    let row;
    if(table_container && table_container.children[0] && table_container.children[0].tagName == 'THEAD'){
        table_container = table_container.appendChild(document.createElement('TBODY'));
    }

    table_container.appendChild(row = document.createElement('tr'));
    row.setAttribute('id', `${tag.sid}`);

    // Label
    row.appendChild(elem = document.createElement('td'));
    elem.setAttribute('id', 'label');
    elem.innerText = `${tag.label}`;

    // Description
    row.appendChild(elem = document.createElement('td'));
    elem.setAttribute('id', 'description');
    elem.innerText = `${tag.description}`;

    // Color
    row.appendChild(elem = document.createElement('td'));
    elem.setAttribute('id', 'color');
    elem.appendChild(elem = document.createElement('div'));
    elem.setAttribute('style', `background-color: rgb(${tag.color.r * 255}, ${tag.color.g * 255}, ${tag.color.b * 255});`);

    // Open Modal
    row.appendChild(elem = document.createElement('td'));
    elem.setAttribute('id', 'modalBtn');
    elem.appendChild(document.createElement('div'));

    // Goto link
    row.appendChild(elem = document.createElement('td'));
    elem.setAttribute('id', 'goto');
    elem.appendChild(document.createElement('div'));

    // Delete
    row.appendChild(elem = document.createElement('td'));
    elem.setAttribute('id', 'icon');
    elem.appendChild(document.createElement('div'));

    return row;
}

async function fetchTags() {
    try {
        // Fetch tags from the database
        const response = await fetch(ENDPOINTS.list, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const dbTags = await response.json();
        // Fetch tags from Matterport SDK
        const mpSdk = await window.MP_SDK.connect(iframe, sdkKey, '3.10');
        const mpTags = await mpSdk.Mattertag.getData();
        const combinedTags = [...dbTags, ...mpTags];
        console.log({combinedTags});
        mpSdk.Mattertag.add(dbTags);
        populateTags(combinedTags);
    } catch (error) {
        console.error("Error in fetchTags:", error);
    }
}

async function loadedShowcaseHandler(mpSdk){
    let addingTag = false;
    let movingTag = false;
    await fetchTags();
    setupTagFunctionality();

    async function placeTag(){
        if(tag){
            mpSdk.Mattertag.navigateToTag(tag, mpSdk.Mattertag.Transition.INSTANT);
            try {
                const tagsData = await mpSdk.Mattertag.getData();
                const tagData = tagsData.find(t => t.sid === tag);

                if (tagData && tagType){
                    await addTagRemote(tagData);
                    tagType=0;
                } else {
                    console.log("Tag not found");
                    tagType=0;
                }
            } catch (error) {
                console.error("Error getting Mattertag data:", error);
            }
        } 
        tag = null;
        movingTag = false;
    }

    if(!isFirefox){
        focusDetect();
    }

    function focusDetect(){
        const eventListener = window.addEventListener('blur', function() {
            if (document.activeElement === iframe) {
                placeTag(); //function you want to call on click
                setTimeout(function(){ window.focus(); }, 0);
            }
            window.removeEventListener('blur', eventListener );
        });
    }

    function overlayDetect(){
        if(tag){
            const overlay = document.createElement('div');
            overlay.setAttribute('class', 'click-overlay');
            overlay.addEventListener('mousemove', e => {
                mpSdk.Renderer.getWorldPositionData({
                    x: e.clientX - 30,
                    y: e.clientY - 5
                })
                .then(data =>{
                    updateTagPos(data.position); 
                })
                .catch(e => {
                    console.error(e);
                    placeTag();
                });

            });
            overlay.addEventListener('click', e => {
                placeTag();
                overlay.remove();
            });
            container.insertAdjacentElement('beforeend', overlay);
        }
    }

    function updateTagPos(newPos, newNorm=undefined, scale=undefined){
        if(!newPos) return;
        // if(!scale) 
        scale = 1;
        // if(!newNorm) 
        newNorm = {x: 0.05, y: 0.05, z: 0.05};

        mpSdk.Tag.editPosition(tag, {
            anchorPosition: newPos,
            stemVector: {
                x: 0.05,
                y: 0.05,
                z: 0.05,
            }
        })
        .catch(e =>{
            console.error(e);
            tag = null;
            movingTag = false;
        });
    }

    mpSdk.Pointer.intersection.subscribe(intersectionData => {
        if(tag && !movingTag){
            if(intersectionData.object === 'intersectedobject.model' || intersectionData.object === 'intersectedobject.sweep'){
                updateTagPos(intersectionData.position, intersectionData.normal);
            }
        }
    });

    addTagViviendaBtn.addEventListener('click', () => {
        if(!addingTag && !tag){
            addingTag = true;
            tagType=1;
            mpSdk.Mattertag.add([{
                label: "Requerimiento en Vivienda",
                description: "",
                anchorPosition: {x: 0, y: 0, z: 0},
                stemVector: {x:0.05, y: 0.05, z: 0.05},
                color: {r: 1, g: 0, b: 0},
                iconId: "public_buildings_house-crack",
                stemVisible:true,
                stemHeight: 1,
            }])
            .then((sid) => {
                tag = sid[0];
                return mpSdk.Mattertag.getData();
            })
            .then( (collection) => {
                const t_sid = collection.find( elem => elem.sid === tag);
                const row = addToTable(t_sid,1);
                addTagListeners(row);
                addingTag = false;
            })
            .then(() => {
                if(isFirefox) overlayDetect(1);
            })
            .catch( (e) => {
                console.error(e);
                addingTag = false;
            })
        }
    });

    addTagSaludBtn.addEventListener('click', () => {
        if(!addingTag && !tag){
            addingTag = true;
            tagType=2;
            mpSdk.Mattertag.add([{
                label: "Requerimiento en salud",
                description: "[Link to Matterport site!](https://www.matterport.com)",
                anchorPosition: {x: 0, y: 0, z: 0},
                stemVector: {x:0.05, y: 0.05, z: 0.05},
                color: {r: 0.5, g: 0.5, b: 1},
                iconId: "public_people_user-doctor",
                stemVisible: true,
                stemHeight:1,
            }])
            .then((sid) => {
                tag = sid[0];
                return mpSdk.Mattertag.getData();
            })
            .then( (collection) => {
                const t_sid = collection.find( elem => elem.sid === tag);
                const row = addToTable(t_sid,2);
                addTagListeners(row);
                addingTag = false;
            })
            .then(() => {
                if(isFirefox) overlayDetect(2);
            })
            .catch( (e) => {
                console.error(e);
                addingTag = false;
            })
        }
    });

    function replaceShowcaseTags(tags){
        return mpSdk.Mattertag.getData()
        .then(oldTags => {
            oldTagSids = oldTags.map(oldTag => oldTag.sid);
            return mpSdk.Mattertag.remove(oldTagSids);
        })
        .then( () => {
            tags.forEach(tag => {
                tag.media.type = "mattertag.media." + tag.media.type;
            });
            return mpSdk.Mattertag.add(tags);
        })
        .then(newSids => {
            tags.forEach( (tag, i) => tag.sid = newSids[i]);
            return tags;
        })
        .catch(e  => {
            console.error(`${e}: ${tags}`);
        });
    }

    async function updateTag(matTagId, label=null, description=null,updateRemote=true){
        if(!label && !description) return;
        try{
            const props = new Object();
            label ? props['label'] = label : {};
            description ? props['description'] = description : {};
            mpSdk.Mattertag.editBillboard(matTagId, props)
            .catch( (e) => { console.error(e); });
            if(updateRemote){
                const tagsData = await mpSdk.Mattertag.getData();
                const tagData = tagsData.find(t => t.sid === matTagId);
                await updateTagRemote(matTagId,tagData);
            }
        }
        catch{
            console.log("Error on update "+matTagId);
        }
    }

    function changeInfo(ele, tagId){
        if(ele.tagName === 'TH'){ return; }
        const desc = ele.innerText;
        const change = document.createElement('input');
        change.id = tagId;
        change.value = desc;
        ele.replaceWith(change);
        change.focus();
        change.addEventListener('blur', (e) => {
            clickAway(change, tagId);
        });
        change.addEventListener('keydown', (e) => {
            if(e.key == "Enter"){
                change.blur();
            }
        });
    }

    function clickAway(ele, tagId) {
        let desc = ele.value;
        const change = document.createElement('td');
        change.id = tagId;
        change.innerText = ele.value;
        ele.replaceWith(change);
        change.removeEventListener('blur', clickAway);
        const lbl = tagId === 'label' ? desc : null;
        desc = tagId === 'description' ? desc : null;
        updateTag(change.parentElement.id, label=lbl, description=desc);
        change.addEventListener('click', () =>{
            changeInfo(change, tagId);
        });
    }

    function addTagListeners(block) {
        console.log(block);
        if (!block || block.children[0].tagName == 'TH') { return; }
    
        // Label
        block.children[0].addEventListener('click', () => {
            changeInfo(block.children[0], tagId='label');
        });
    
        // Description
        block.children[1].addEventListener('click', () => {
            changeInfo(block.children[1], tagId='description');
        });
    
        // Modal
        block.children[3].addEventListener('click', () => {
            // Obtener el modal y el iframe
            const modal = document.getElementById('myModal');
            const modalIframe = document.getElementById('modalIframe');
    
            // Asignar el src del iframe (puedes cambiarlo según necesites)
            modalIframe.src = `${BACK_END_MODAL}/inspector.php?mattertag=`+block.id; // o cualquier otra URL que necesites
    
            // Mostrar el modal
            modal.style.display = "block";
    
            // Cerrar el modal al hacer clic en (x)
            const closeModalButton = document.querySelector('.close');
            closeModalButton.onclick = function() {
                modal.style.display = "none";
                modalIframe.src = ""; // Limpiar el src del iframe al cerrar el modal
                updateDataModal(block.id);
            }
    
            // Cerrar el modal al hacer clic fuera del modal
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                    modalIframe.src = ""; // Limpiar el src del iframe al cerrar el modal
                }
                updateDataModal(block.id);
            }
        });
    
        // Arrow icon
        block.children[4].addEventListener('click', () => {
            mpSdk.Mattertag.navigateToTag(block.id, mpSdk.Mattertag.Transition.FADEOUT)
            .catch((e) => { console.error(e); });
        });
    
        // Delete icon
        block.children[5].addEventListener('click', async () => {
            try {
                block.parentNode.removeChild(block);
                deleteTagRemote(block.id);
                mpSdk.Mattertag.remove(block.id)
                .catch((e) => { console.log(e); });
            } catch(e) {
                console.log("Error on delete " + block.id);
            }
        });
    }
    async function updateDataModal(tagId){
        // matTagId, label=null, description=null,updateRemote=true
        const response=viewTagRemote(tagId);
        if(response.ok){            
            updateTag(tagId,response?.data?.label,response?.data?.description,false);
        }
    }    
    function setupTagFunctionality(){
        document.querySelectorAll('tr').forEach(addTagListeners);
    }
} // loadedShowcaseHandler
